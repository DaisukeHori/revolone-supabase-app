-- Add MFA fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS mfa_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_type text,
ADD COLUMN IF NOT EXISTS mfa_secret text,
ADD COLUMN IF NOT EXISTS phone_number text,
ADD COLUMN IF NOT EXISTS backup_codes jsonb;
