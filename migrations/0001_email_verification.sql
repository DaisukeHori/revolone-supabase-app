-- Add email verification fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token text,
ADD COLUMN IF NOT EXISTS email_verification_token_expires timestamp with time zone;
