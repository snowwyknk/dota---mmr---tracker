const test = require('node:test');
const assert = require('node:assert/strict');
const {
    validateHeroProgress,
    isValidHeroProgressId
} = require('../server/hero-progress');

test('normalizes and validates a hero progress record', () => {
    assert.deepEqual(validateHeroProgress({
        heroName: '  Shadow   Fiend ',
        level: 5,
        currentXp: 200
    }), {
        heroName: 'Shadow Fiend',
        heroKey: 'shadow fiend',
        level: 5,
        currentXp: 200
    });
    assert.equal(validateHeroProgress({
        heroName: 'Ａxe',
        level: 1,
        currentXp: 0
    }).heroName, 'Axe');
});

test('validates experience against the selected level, including level 30', () => {
    assert.equal(validateHeroProgress({
        heroName: 'Axe',
        level: 5,
        currentXp: 899
    }).currentXp, 899);
    assert.equal(validateHeroProgress({
        heroName: 'Axe',
        level: 5,
        currentXp: 900
    }), null);
    assert.equal(validateHeroProgress({
        heroName: 'Axe',
        level: 30,
        currentXp: 1
    }), null);
});

test('rejects invalid names, levels, progress, and identifiers', () => {
    assert.equal(validateHeroProgress({ heroName: ' ', level: 1, currentXp: 0 }), null);
    assert.equal(validateHeroProgress({ heroName: 'Axe', level: 31, currentXp: 0 }), null);
    assert.equal(validateHeroProgress({ heroName: 'Axe', level: 1, currentXp: -1 }), null);
    assert.equal(validateHeroProgress({ heroName: 'A'.repeat(51), level: 1, currentXp: 0 }), null);
    assert.equal(validateHeroProgress(null), null);
    assert.equal(isValidHeroProgressId('12'), true);
    assert.equal(isValidHeroProgressId('0'), false);
    assert.equal(isValidHeroProgressId('1x'), false);
    assert.equal(isValidHeroProgressId('9'.repeat(19)), true);
    assert.equal(isValidHeroProgressId('9'.repeat(20)), false);
});
