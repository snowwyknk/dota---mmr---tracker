const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidSteamId, isValidOpenIdNonce, isValidLoginState } = require('../server/steam-id');

test('accepts a 17-digit Steam ID', () => {
    assert.equal(isValidSteamId('76561198000000000'), true);
});

test('rejects malformed or non-string Steam IDs', () => {
    assert.equal(isValidSteamId('123'), false);
    assert.equal(isValidSteamId('765611980000000000'), false);
    assert.equal(isValidSteamId('steam-id'), false);
    assert.equal(isValidSteamId(76561198000000000), false);
});

test('accepts fresh Steam OpenID nonces and rejects stale or malformed ones', () => {
    const now = Date.UTC(2026, 10, 18, 12, 0, 0);
    assert.equal(isValidOpenIdNonce('2026-11-18T11:59:30Znonce', now), true);
    assert.equal(isValidOpenIdNonce('2026-11-18T11:40:00Znonce', now), false);
    assert.equal(isValidOpenIdNonce('2026-11-18T12:02:00Znonce', now), false);
    assert.equal(isValidOpenIdNonce('not-a-nonce', now), false);
});

test('requires a fixed-length hexadecimal login state', () => {
    assert.equal(isValidLoginState('a'.repeat(64)), true);
    assert.equal(isValidLoginState('a'.repeat(63)), false);
    assert.equal(isValidLoginState('g'.repeat(64)), false);
});
