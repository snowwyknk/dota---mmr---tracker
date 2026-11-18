const heroProgression = (() => {
    const pointsToReachLevel = Object.freeze([
        0, 50, 300, 400, 500, 600, 900, 1000, 1100, 1200, 1300,
        1400, 1700, 1800, 1900, 2000, 2100, 2200, 2500, 2600, 2700,
        2800, 2900, 3000, 3100, 6800, 4000, 4200, 4400, 4600, 8000
    ]);
    const tiers = Object.freeze([
        Object.freeze({ name: 'Бронза', image: 'bronze.png', minLevel: 0, maxLevel: 5 }),
        Object.freeze({ name: 'Серебро', image: 'silver.png', minLevel: 6, maxLevel: 11 }),
        Object.freeze({ name: 'Золото', image: 'gold.png', minLevel: 12, maxLevel: 17 }),
        Object.freeze({ name: 'Платина', image: 'platinum.png', minLevel: 18, maxLevel: 24 }),
        Object.freeze({ name: 'Мастер', image: 'master.png', minLevel: 25, maxLevel: 29 }),
        Object.freeze({ name: 'Грандмастер', image: 'grandmaster.png', minLevel: 30, maxLevel: 30 })
    ]);

    function validateLevel(level) {
        return Number.isInteger(level) && level >= 0 && level <= 30;
    }

    function getTier(level) {
        if (!validateLevel(level)) {
            throw new RangeError('Hero level must be an integer from 0 to 30.');
        }
        return tiers.find(tier => level >= tier.minLevel && level <= tier.maxLevel);
    }

    function getNextLevelPointCost(level) {
        if (!validateLevel(level)) {
            throw new RangeError('Hero level must be an integer from 0 to 30.');
        }
        return level === 30 ? 0 : pointsToReachLevel[level + 1];
    }

    function getMaxProgress(level) {
        const nextLevelCost = getNextLevelPointCost(level);
        return Math.max(0, nextLevelCost - 1);
    }

    function calculatePointsNeeded(currentLevel, targetLevel, currentProgress = 0) {
        if (!validateLevel(currentLevel) || !validateLevel(targetLevel) || targetLevel < currentLevel) {
            throw new RangeError('Target level must be from the current level through level 30.');
        }
        if (!Number.isInteger(currentProgress) || currentProgress < 0 ||
            currentProgress > getMaxProgress(currentLevel)) {
            throw new RangeError('Current progress must be below the next level requirement.');
        }

        let pointsNeeded = -currentProgress;
        for (let level = currentLevel + 1; level <= targetLevel; level++) {
            pointsNeeded += pointsToReachLevel[level];
        }
        return pointsNeeded;
    }

    return Object.freeze({
        maxLevel: 30,
        pointsToReachLevel,
        tiers,
        getTier,
        getNextLevelPointCost,
        getMaxProgress,
        calculatePointsNeeded
    });
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = heroProgression;
}
if (typeof window !== 'undefined') {
    window.heroProgression = heroProgression;
}
