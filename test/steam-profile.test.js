const test = require('node:test');
const assert = require('node:assert/strict');
const {
    fetchSteamProfile,
    parseSteamProfileResponse,
    getSafeAvatarUrl
} = require('../server/steam-profile');

const steamId = '76561198000000000';
const validAvatar = 'https://avatars.steamstatic.com/abcd1234_full.jpg';

test('maps a public Steam profile to a safe display name and avatar', () => {
    const profile = parseSteamProfileResponse({
        response: {
            players: [{
                steamid: steamId,
                personaname: '  Dota Player  ',
                avatarfull: validAvatar
            }]
        }
    }, steamId);

    assert.deepEqual(profile, {
        personaName: 'Dota Player',
        avatarUrl: validAvatar
    });
});

test('does not accept avatar URLs from untrusted hosts or protocols', () => {
    assert.equal(getSafeAvatarUrl('http://avatars.steamstatic.com/avatar.jpg'), null);
    assert.equal(getSafeAvatarUrl('https://example.com/avatar.jpg'), null);
    assert.equal(getSafeAvatarUrl('https://user@avatars.steamstatic.com/avatar.jpg'), null);
});

test('skips the external Steam API when no API key is configured', async () => {
    let requested = false;
    const profile = await fetchSteamProfile(steamId, '', async () => {
        requested = true;
    });

    assert.equal(profile, null);
    assert.equal(requested, false);
});

test('requests only the authenticated Steam ID and returns its profile', async () => {
    let requestedUrl;
    const profile = await fetchSteamProfile(steamId, 'test-api-key', async url => {
        requestedUrl = new URL(url);
        return {
            ok: true,
            json: async () => ({
                response: {
                    players: [{
                        steamid: steamId,
                        personaname: 'Player One',
                        avatarfull: validAvatar
                    }]
                }
            })
        };
    });

    assert.equal(requestedUrl.origin, 'https://api.steampowered.com');
    assert.equal(requestedUrl.searchParams.get('steamids'), steamId);
    assert.equal(requestedUrl.searchParams.get('key'), 'test-api-key');
    assert.deepEqual(profile, { personaName: 'Player One', avatarUrl: validAvatar });
});

test('rejects invalid Steam IDs and malformed API responses', async () => {
    await assert.rejects(() => fetchSteamProfile('123', 'test-api-key'), TypeError);
    assert.throws(() => parseSteamProfileResponse({}, steamId), /invalid shape/);
});
