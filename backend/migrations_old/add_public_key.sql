-- Migration: Add public_key field to User table
-- Date: 2025-11-04
-- Description: Add public_key field for end-to-end encryption support

-- Check if column exists before adding
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='user' AND column_name='public_key'
    ) THEN
        ALTER TABLE "user" ADD COLUMN public_key TEXT NULL;
    END IF;
END $$;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_wallet_address ON "user"(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_public_key ON "user"(public_key);
