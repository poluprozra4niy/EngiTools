-- Enable Row Level Security (RLS) to secure the table
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

-- Allow users to view ONLY their own data
CREATE POLICY "Users can view own AI settings"
ON user_ai_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "Users can insert own AI settings"
ON user_ai_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update ONLY their own data
CREATE POLICY "Users can update own AI settings"
ON user_ai_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete ONLY their own data
CREATE POLICY "Users can delete own AI settings"
ON user_ai_settings
FOR DELETE
USING (auth.uid() = user_id);
