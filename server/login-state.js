const crypto = require('node:crypto');
const { isValidLoginState } = require('./steam-id');

const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;
const MAX_PENDING_LOGIN_STATES = 10;

function getValidPendingStates(session, now) {
    const storedStates = session.steamLoginStates;
    if (!storedStates || typeof storedStates !== 'object' || Array.isArray(storedStates)) {
        return new Map();
    }

    return new Map(Object.entries(storedStates).filter(([state, issuedAt]) =>
        isValidLoginState(state) &&
        Number.isSafeInteger(issuedAt) &&
        issuedAt <= now &&
        now - issuedAt <= LOGIN_STATE_TTL_MS
    ));
}

function savePendingStates(session, states) {
    if (states.size === 0) {
        delete session.steamLoginStates;
        return;
    }
    session.steamLoginStates = Object.fromEntries(states);
}

function createSteamLoginState(session, now = Date.now()) {
    if (!session || typeof session !== 'object' || !Number.isSafeInteger(now)) {
        throw new TypeError('A session and a valid timestamp are required to create login state.');
    }

    const pendingStates = getValidPendingStates(session, now);
    pendingStates.set(crypto.randomBytes(32).toString('hex'), now);
    const newestStates = Array.from(pendingStates.entries())
        .sort((left, right) => left[1] - right[1])
        .slice(-MAX_PENDING_LOGIN_STATES);
    const state = newestStates[newestStates.length - 1][0];
    savePendingStates(session, new Map(newestStates));
    return state;
}

function consumeSteamLoginState(session, state, now = Date.now()) {
    if (!session || typeof session !== 'object' ||
        !isValidLoginState(state) || !Number.isSafeInteger(now)) {
        return false;
    }

    const pendingStates = getValidPendingStates(session, now);
    const issuedAt = pendingStates.get(state);
    pendingStates.delete(state);
    savePendingStates(session, pendingStates);

    return Number.isSafeInteger(issuedAt) &&
        issuedAt <= now &&
        now - issuedAt <= LOGIN_STATE_TTL_MS;
}

module.exports = {
    createSteamLoginState,
    consumeSteamLoginState,
    LOGIN_STATE_TTL_MS,
    MAX_PENDING_LOGIN_STATES
};
