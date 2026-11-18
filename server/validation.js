const MAX_MMR = 100000;

function isValidMmr(value) {
    return Number.isSafeInteger(value) && value >= 0 && value <= MAX_MMR;
}

module.exports = { isValidMmr, MAX_MMR };
