ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS custom_avatar_data_url TEXT;
