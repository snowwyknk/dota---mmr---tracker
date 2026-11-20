const { isValidSteamId } = require('./steam-id');

const STEAM_API_URL = 'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';
const ALLOWED_AVATAR_HOSTS = new Set([
    'avatars.steamstatic.com',
    'steamcdn-a.akamaihd.net',
    'steamcommunity.akamaihd.net'
]);

function getSafeAvatarUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) {
        return null;
    }

    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || !ALLOWED_AVATAR_HOSTS.has(url.hostname) ||
            url.username || url.password) {
            return null;
        }
        return url.href;
    } catch {
        return null;
    }
}

function parseSteamProfileResponse(data, steamId) {
    const players = data && data.response && data.response.players;
    if (!Array.isArray(players)) {
        throw new Error('Steam profile response has an invalid shape.');
    }

    const player = players.find(item => item && item.steamid === steamId);
    if (!player) {
        return null;
    }

    const personaName = typeof player.personaname === 'string'
        ? player.personaname.trim().slice(0, 128)
        : '';
    const avatarUrl = getSafeAvatarUrl(player.avatarfull) ||
        getSafeAvatarUrl(player.avatar);

    if (!personaName && !avatarUrl) {
        return null;
    }

    return {
        personaName: personaName || null,
        avatarUrl
    };
}

async function fetchSteamProfile(steamId, apiKey, request = globalThis.fetch) {
    if (!isValidSteamId(steamId)) {
        throw new TypeError('A valid Steam ID is required.');
    }
    if (!apiKey) {
        return null;
    }
    if (typeof apiKey !== 'string' || typeof request !== 'function') {
        throw new TypeError('A Steam API key and fetch implementation are required.');
    }

    const url = new URL(STEAM_API_URL);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('steamids', steamId);

    const response = await request(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
        throw new Error(`Steam profile API returned HTTP ${response.status}.`);
    }

    return parseSteamProfileResponse(await response.json(), steamId);
}

module.exports = {
    fetchSteamProfile,
    parseSteamProfileResponse,
    getSafeAvatarUrl
};
