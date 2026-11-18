const test = require('node:test');
const assert = require('node:assert/strict');
const {
    createSteamLoginState,
    consumeSteamLoginState,
    LOGIN_STATE_TTL_MS,
    MAX_PENDING_LOGIN_STATES
} = require('../server/login-state');

test('keeps concurrent login attempts separate and consumes each state once', () => {
    const session = {};
    const now = Date.UTC(2026, 10, 18, 12, 0, 0);
    const firstState = createSteamLoginState(session, now);
    const secondState = createSteamLoginState(session, now + 1);

    assert.notEqual(firstState, secondState);
    assert.equal(consumeSteamLoginState(session, firstState, now + 2), true);
    assert.equal(consumeSteamLoginState(session, firstState, now + 2), false);
    assert.equal(consumeSteamLoginState(session, secondState, now + 2), true);
});

test('rejects expired, future, malformed, and unknown login states', () => {
    const session = {};
    const now = Date.UTC(2026, 10, 18, 12, 0, 0);
    const expiredState = createSteamLoginState(session, now - LOGIN_STATE_TTL_MS - 1);
    const futureState = createSteamLoginState(session, now + 1);

    assert.equal(consumeSteamLoginState(session, expiredState, now), false);
    assert.equal(consumeSteamLoginState(session, futureState, now), false);
    assert.equal(consumeSteamLoginState(session, 'not-a-state', now), false);
    assert.equal(consumeSteamLoginState(session, 'f'.repeat(64), now), false);
});

test('limits retained pending login attempts', () => {
    const session = {};
    const now = Date.UTC(2026, 10, 18, 12, 0, 0);
    const states = [];

    for (let attempt = 0; attempt < MAX_PENDING_LOGIN_STATES + 1; attempt++) {
        states.push(createSteamLoginState(session, now + attempt));
    }

    assert.equal(Object.keys(session.steamLoginStates).length, MAX_PENDING_LOGIN_STATES);
    assert.equal(consumeSteamLoginState(session, states[0], now + MAX_PENDING_LOGIN_STATES), false);
    assert.equal(consumeSteamLoginState(
        session,
        states[states.length - 1],
        now + MAX_PENDING_LOGIN_STATES
    ), true);
});
