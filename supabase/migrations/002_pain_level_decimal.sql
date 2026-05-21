-- Allow half-step pain levels (e.g. 0.5, 1.5, 2.5).
-- pain_level becomes numeric(3,1) so it can store one decimal place.
-- The CHECK range stays 0–10. We re-create the constraint to avoid relying on its prior name.

-- Production tables (public schema)
ALTER TABLE pain_entries ALTER COLUMN pain_level TYPE numeric(3,1) USING pain_level::numeric(3,1);
ALTER TABLE pain_entries DROP CONSTRAINT IF EXISTS pain_entries_pain_level_check;
ALTER TABLE pain_entries ADD CONSTRAINT pain_entries_pain_level_check CHECK (pain_level >= 0 AND pain_level <= 10);

-- Dev/staging tables
ALTER TABLE dev_pain_entries ALTER COLUMN pain_level TYPE numeric(3,1) USING pain_level::numeric(3,1);
ALTER TABLE dev_pain_entries DROP CONSTRAINT IF EXISTS dev_pain_entries_pain_level_check;
ALTER TABLE dev_pain_entries ADD CONSTRAINT dev_pain_entries_pain_level_check CHECK (pain_level >= 0 AND pain_level <= 10);
