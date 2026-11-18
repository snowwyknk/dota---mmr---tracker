const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidMmr } = require('../server/validation');

test('accepts integer MMR values within the supported range', () => {
    assert.equal(isValidMmr(0), true);
    assert.equal(isValidMmr(100000), true);
    assert.equal(isValidMmr(2100), true);
});

test('rejects invalid MMR values', () => {
    assert.equal(isValidMmr(-1), false);
    assert.equal(isValidMmr(100001), false);
    assert.equal(isValidMmr(2100.5), false);
    assert.equal(isValidMmr('2100'), false);
});
