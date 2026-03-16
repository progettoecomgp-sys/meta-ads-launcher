-- Add hidden_fields and upload_defaults columns to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS hidden_fields JSONB DEFAULT '{}';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS upload_defaults JSONB DEFAULT '{}';
