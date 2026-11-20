const fs = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

pool.on('error', error => {
    console.error('Unexpected PostgreSQL pool error:', error);
});

async function initializeDatabase() {
    const migrationsPath = path.join(__dirname, '..', 'migrations');
    const migrationFiles = (await fs.readdir(migrationsPath))
        .filter(file => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
        .sort((left, right) => Number(left.match(/^\d+/)[0]) - Number(right.match(/^\d+/)[0]));

    for (const migrationFile of migrationFiles) {
        const migration = await fs.readFile(path.join(migrationsPath, migrationFile), 'utf8');
        await pool.query(migration);
    }
}

async function findOrCreateProfile(steamId, steamProfile = null) {
    const result = await pool.query(
        `INSERT INTO profiles (steam_id, steam_persona_name, steam_avatar_url)
         VALUES ($1, $2, $3)
         ON CONFLICT (steam_id)
         DO UPDATE SET
            last_login_at = NOW(),
            steam_persona_name = COALESCE(EXCLUDED.steam_persona_name, profiles.steam_persona_name),
            steam_avatar_url = COALESCE(EXCLUDED.steam_avatar_url, profiles.steam_avatar_url)
         RETURNING steam_id, current_mmr, steam_persona_name, steam_avatar_url, created_at, updated_at`,
        [steamId, steamProfile ? steamProfile.personaName : null, steamProfile ? steamProfile.avatarUrl : null]
    );
    return result.rows[0];
}

async function getProfile(steamId) {
    const result = await pool.query(
        `SELECT steam_id, current_mmr, steam_persona_name, steam_avatar_url, created_at, updated_at
         FROM profiles
         WHERE steam_id = $1`,
        [steamId]
    );
    return result.rows[0] || null;
}

async function updateProfileMmr(steamId, mmr) {
    const result = await pool.query(
        `UPDATE profiles
         SET current_mmr = $2, updated_at = NOW()
         WHERE steam_id = $1
         RETURNING steam_id, current_mmr, steam_persona_name, steam_avatar_url, created_at, updated_at`,
        [steamId, mmr]
    );
    return result.rows[0] || null;
}

async function recordOpenIdNonce(nonce) {
    await pool.query(`DELETE FROM steam_openid_nonces WHERE created_at < NOW() - INTERVAL '1 day'`);
    await pool.query('INSERT INTO steam_openid_nonces (nonce) VALUES ($1)', [nonce]);
}

module.exports = {
    pool,
    initializeDatabase,
    findOrCreateProfile,
    getProfile,
    updateProfileMmr,
    recordOpenIdNonce
};
