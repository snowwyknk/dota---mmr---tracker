const progression = require('../public/assets/js/hero-progression');

const MAX_HERO_NAME_LENGTH = 50;

function validateHeroProgress(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        return null;
    }

    if (typeof input.heroName !== 'string') {
        return null;
    }
    const heroName = input.heroName.normalize('NFKC').trim().replace(/\s+/g, ' ');
    const heroKey = heroName.toLocaleLowerCase('en-US');
    if (!heroName || heroName.length > MAX_HERO_NAME_LENGTH || heroKey.length > MAX_HERO_NAME_LENGTH ||
        /[\u0000-\u001f\u007f]/.test(heroName)) {
        return null;
    }

    if (!Number.isInteger(input.level)) {
        return null;
    }

    const level = input.level;
    const currentXp = input.currentXp;
    if (level < 0 || level > progression.maxLevel ||
        !Number.isSafeInteger(currentXp) || currentXp < 0 ||
        currentXp > progression.getMaxProgress(level)) {
        return null;
    }

    return {
        heroName,
        heroKey,
        level,
        currentXp
    };
}

function isValidHeroProgressId(value) {
    return typeof value === 'string' && /^[1-9]\d{0,18}$/.test(value);
}

module.exports = {
    validateHeroProgress,
    isValidHeroProgressId
};
