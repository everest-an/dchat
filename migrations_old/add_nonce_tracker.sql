-- Migration: Add Nonce Tracker Table
-- Description: Create table for tracking transaction nonces
-- Author: Manus AI
-- Date: 2025-11-05

-- Create nonce_tracker table
CREATE TABLE IF NOT EXISTS nonce_tracker (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    current_nonce INTEGER NOT NULL DEFAULT 0,
    pending_nonces JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lock_token VARCHAR(64),
    lock_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nonce_tracker_wallet_address ON nonce_tracker(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nonce_tracker_lock_expires ON nonce_tracker(lock_expires_at) WHERE lock_expires_at IS NOT NULL;

-- Add comments
COMMENT ON TABLE nonce_tracker IS 'Tracks transaction nonces for custodial wallets';
COMMENT ON COLUMN nonce_tracker.wallet_address IS 'Ethereum wallet address';
COMMENT ON COLUMN nonce_tracker.current_nonce IS 'Next nonce to use for transactions';
COMMENT ON COLUMN nonce_tracker.pending_nonces IS 'Array of nonces for pending transactions';
COMMENT ON COLUMN nonce_tracker.lock_token IS 'UUID token for distributed locking';
COMMENT ON COLUMN nonce_tracker.lock_expires_at IS 'Lock expiration timestamp';
