const test = require('node:test');
const assert = require('node:assert/strict');
const heroProgression = require('../public/assets/js/hero-progression');

test('uses the supplied XP values and totals to the Grandmaster level', () => {
    assert.equal(heroProgression.calculatePointsNeeded(0, 30), 72050);
    assert.equal(heroProgression.calculatePointsNeeded(1, 30), 72000);
    assert.equal(heroProgression.calculatePointsNeeded(29, 30), 8000);
});

test('subtracts progress already earned toward the next level', () => {
    assert.equal(heroProgression.calculatePointsNeeded(5, 6, 200), 700);
    assert.equal(heroProgression.calculatePointsNeeded(5, 7, 200), 1700);
});

test('maps hero levels to the medal tiers at the supplied boundaries', () => {
    assert.equal(heroProgression.getTier(0).name, 'Бронза');
    assert.equal(heroProgression.getTier(5).name, 'Бронза');
    assert.equal(heroProgression.getTier(6).name, 'Серебро');
    assert.equal(heroProgression.getTier(12).name, 'Золото');
    assert.equal(heroProgression.getTier(18).name, 'Платина');
    assert.equal(heroProgression.getTier(25).name, 'Мастер');
    assert.equal(heroProgression.getTier(30).name, 'Грандмастер');
});

test('rejects invalid level and progress inputs', () => {
    assert.throws(() => heroProgression.calculatePointsNeeded(1, 31), RangeError);
    assert.throws(() => heroProgression.calculatePointsNeeded(5, 6, 900), RangeError);
    assert.throws(() => heroProgression.calculatePointsNeeded(8, 7), RangeError);
});
