CREATE TABLE IF NOT EXISTS profiles (
    steam_id VARCHAR(17) PRIMARY KEY,
    current_mmr INTEGER CHECK (current_mmr IS NULL OR current_mmr BETWEEN 0 AND 100000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS steam_openid_nonces (
    nonce TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
