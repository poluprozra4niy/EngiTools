-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_ai_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gemini_api_key TEXT,
  openai_api_key TEXT,
  anthropic_api_key TEXT,
  custom_api_key TEXT,
  custom_api_url TEXT,
  selected_model TEXT,
  default_provider TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on rerun
DROP POLICY IF EXISTS "Users can view own AI settings" ON user_ai_settings;
DROP POLICY IF EXISTS "Users can insert own AI settings" ON user_ai_settings;
DROP POLICY IF EXISTS "Users can update own AI settings" ON user_ai_settings;
DROP POLICY IF EXISTS "Users can delete own AI settings" ON user_ai_settings;

-- Create Policies

-- 1. View own data
CREATE POLICY "Users can view own AI settings"
ON user_ai_settings
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Insert own data
CREATE POLICY "Users can insert own AI settings"
ON user_ai_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3. Update own data
CREATE POLICY "Users can update own AI settings"
ON user_ai_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Delete own data
CREATE POLICY "Users can delete own AI settings"
ON user_ai_settings
FOR DELETE
USING (auth.uid() = user_id);
