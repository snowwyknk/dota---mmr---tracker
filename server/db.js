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
         RETURNING steam_id, current_mmr, steam_persona_name, steam_avatar_url,
                   custom_avatar_data_url, created_at, updated_at`,
        [steamId, steamProfile ? steamProfile.personaName : null, steamProfile ? steamProfile.avatarUrl : null]
    );
    return result.rows[0];
}

async function getProfile(steamId) {
    const result = await pool.query(
        `SELECT steam_id, current_mmr, steam_persona_name, steam_avatar_url,
                custom_avatar_data_url, created_at, updated_at
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
         RETURNING steam_id, current_mmr, steam_persona_name, steam_avatar_url,
                   custom_avatar_data_url, created_at, updated_at`,
        [steamId, mmr]
    );
    return result.rows[0] || null;
}

async function getMmrHistory(steamId, days) {
    const result = await pool.query(
        `WITH bounds AS (
            SELECT statement_timestamp() - $2::int * INTERVAL '24 hours' AS start_at,
                   statement_timestamp() AS end_at
         ), baseline AS (
            SELECT id, mmr, recorded_at
            FROM mmr_history, bounds
            WHERE steam_id = $1 AND recorded_at < start_at
            ORDER BY recorded_at DESC, id DESC
            LIMIT 1
         ), period AS (
            SELECT id, mmr, recorded_at
            FROM mmr_history, bounds
            WHERE steam_id = $1 AND recorded_at BETWEEN start_at AND end_at
         ), first_in_period AS (
            SELECT id, mmr, recorded_at
            FROM period
            WHERE NOT EXISTS (SELECT 1 FROM baseline)
            ORDER BY recorded_at, id
            LIMIT 1
         ), daily AS (
            SELECT DISTINCT ON ((recorded_at AT TIME ZONE 'UTC')::date) id, mmr, recorded_at
            FROM period
            ORDER BY (recorded_at AT TIME ZONE 'UTC')::date, recorded_at DESC, id DESC
         ), points AS (
            SELECT * FROM baseline
            UNION
            SELECT * FROM first_in_period
            UNION
            SELECT * FROM daily
         )
         SELECT start_at AS start, end_at AS end,
                COALESCE((
                    SELECT json_agg(
                        json_build_object('mmr', mmr, 'recordedAt', recorded_at, 'baseline', recorded_at < start_at)
                        ORDER BY recorded_at, id
                    )
                    FROM points
                ), '[]'::json) AS points
         FROM bounds`,
        [steamId, days]
    );
    return result.rows[0];
}

async function updateProfileAvatar(steamId, avatarDataUrl) {
    const result = await pool.query(
        `UPDATE profiles
         SET custom_avatar_data_url = $2, updated_at = NOW()
         WHERE steam_id = $1
         RETURNING steam_id, current_mmr, steam_persona_name, steam_avatar_url,
                   custom_avatar_data_url, created_at, updated_at`,
        [steamId, avatarDataUrl]
    );
    return result.rows[0] || null;
}

async function getHeroProgress(steamId) {
    const result = await pool.query(
        `SELECT id, hero_name, hero_level, current_xp, created_at, updated_at
         FROM hero_progress
         WHERE steam_id = $1
         ORDER BY lower(hero_name), hero_name`,
        [steamId]
    );
    return result.rows;
}

async function saveHeroProgress(steamId, progress) {
    const result = await pool.query(
        `INSERT INTO hero_progress (steam_id, hero_key, hero_name, hero_level, current_xp)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (steam_id, hero_key)
         DO UPDATE SET
            hero_name = EXCLUDED.hero_name,
            hero_level = EXCLUDED.hero_level,
            current_xp = EXCLUDED.current_xp,
            updated_at = NOW()
         RETURNING id, hero_name, hero_level, current_xp, created_at, updated_at`,
        [steamId, progress.heroKey, progress.heroName, progress.level, progress.currentXp]
    );
    return result.rows[0];
}

async function deleteHeroProgress(steamId, heroId) {
    const result = await pool.query(
        `DELETE FROM hero_progress
         WHERE steam_id = $1 AND id = $2
         RETURNING id`,
        [steamId, heroId]
    );
    return result.rowCount > 0;
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
    getMmrHistory,
    updateProfileAvatar,
    getHeroProgress,
    saveHeroProgress,
    deleteHeroProgress,
    recordOpenIdNonce
};
