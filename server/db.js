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
    const migrationPath = path.join(__dirname, '..', 'migrations', '001_profiles.sql');
    const migration = await fs.readFile(migrationPath, 'utf8');
    await pool.query(migration);
}

async function findOrCreateProfile(steamId) {
    const result = await pool.query(
        `INSERT INTO profiles (steam_id)
         VALUES ($1)
         ON CONFLICT (steam_id)
         DO UPDATE SET last_login_at = NOW()
         RETURNING steam_id, current_mmr, created_at, updated_at`,
        [steamId]
    );
    return result.rows[0];
}

async function getProfile(steamId) {
    const result = await pool.query(
        `SELECT steam_id, current_mmr, created_at, updated_at
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
         RETURNING steam_id, current_mmr, created_at, updated_at`,
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
