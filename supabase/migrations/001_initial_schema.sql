-- Pain entries
-- prompt_type: overnight = "how was pain last night" (morning screen)
--              morning   = "how is pain now" (morning screen)
--              afternoon = screen 2
--              evening   = screen 3
--              bedtime   = screen 4
-- sleep_quality: text, only set on 'overnight' entries
CREATE TABLE pain_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type text NOT NULL CHECK (prompt_type IN ('overnight','morning','afternoon','evening','bedtime')),
  pain_level int NOT NULL CHECK (pain_level BETWEEN 1 AND 10),
  sleep_quality text CHECK (sleep_quality IN ('terrible','poor','fair','good','fantastic')),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Activity categories (seeded with 4 built-ins + user-added)
CREATE TABLE activity_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sub_prompt_type text NOT NULL CHECK (sub_prompt_type IN ('boolean','distance','intensity','none')),
  sub_prompt_label text,
  is_builtin boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO activity_categories (name, sub_prompt_type, sub_prompt_label, is_builtin, sort_order) VALUES
  ('Tennis', 'boolean', 'Did you serve?', true, 1),
  ('Walking', 'distance', 'How far? (km)', true, 2),
  ('Gardening', 'intensity', 'Intensity level', true, 3),
  ('Tidying', 'intensity', 'Intensity level', true, 4);

-- Activity entries (per activity per day)
CREATE TABLE activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES activity_categories(id),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  did_activity boolean NOT NULL DEFAULT false,
  sub_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- PT exercises (one per day)
CREATE TABLE pt_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  completed text NOT NULL CHECK (completed IN ('no','once','twice')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Medication: two separate yes/no fields, one row per day
-- oxycodone_last_night  = asked on morning screen ("did you take oxycodone last night?")
-- oxycodone_this_afternoon = asked on bedtime screen ("did you take oxycodone this afternoon?")
CREATE TABLE medication_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  oxycodone_last_night boolean NOT NULL DEFAULT false,
  oxycodone_this_afternoon boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notification settings (single row)
CREATE TABLE notification_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  morning_time time NOT NULL DEFAULT '09:00',
  afternoon_time time NOT NULL DEFAULT '13:00',
  evening_time time NOT NULL DEFAULT '17:00',
  bedtime_time time NOT NULL DEFAULT '21:00',
  timezone text NOT NULL DEFAULT 'Europe/London',
  push_subscription jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO notification_settings (id) VALUES (1);
