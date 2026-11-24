CREATE TABLE IF NOT EXISTS mmr_history (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    steam_id VARCHAR(17) NOT NULL REFERENCES profiles (steam_id) ON DELETE CASCADE,
    mmr INTEGER NOT NULL CHECK (mmr BETWEEN 0 AND 100000),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS mmr_history_profile_date_idx
    ON mmr_history (steam_id, recorded_at DESC, id DESC);

CREATE OR REPLACE FUNCTION record_profile_mmr_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO mmr_history (steam_id, mmr) VALUES (NEW.steam_id, NEW.current_mmr);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS record_profile_mmr_change ON profiles;
CREATE TRIGGER record_profile_mmr_change
AFTER UPDATE OF current_mmr ON profiles
FOR EACH ROW
WHEN (NEW.current_mmr IS NOT NULL AND OLD.current_mmr IS DISTINCT FROM NEW.current_mmr)
EXECUTE FUNCTION record_profile_mmr_change();

-- Record the known rating at migration time. Earlier changes cannot be recovered.
INSERT INTO mmr_history (steam_id, mmr)
SELECT profiles.steam_id, profiles.current_mmr
FROM profiles
WHERE profiles.current_mmr IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM mmr_history WHERE mmr_history.steam_id = profiles.steam_id);
