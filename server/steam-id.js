function isValidSteamId(steamId) {
    return typeof steamId === 'string' && /^[0-9]{17}$/.test(steamId);
}

function isValidOpenIdNonce(nonce, now = Date.now()) {
    if (typeof nonce !== 'string' || nonce.length < 21 || nonce.length > 255) {
        return false;
    }

    const timestamp = nonce.slice(0, 20);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(timestamp)) {
        return false;
    }

    const nonceTime = Date.parse(timestamp);
    return Number.isFinite(nonceTime) && nonceTime <= now + 60000 && now - nonceTime <= 600000;
}

function isValidLoginState(state) {
    return typeof state === 'string' && /^[a-f0-9]{64}$/.test(state);
}

module.exports = { isValidSteamId, isValidOpenIdNonce, isValidLoginState };
