ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS steam_persona_name TEXT,
    ADD COLUMN IF NOT EXISTS steam_avatar_url TEXT;
