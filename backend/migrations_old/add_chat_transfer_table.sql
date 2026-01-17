-- Chat Transfer Table Migration
-- Creates table for in-chat money transfers (similar to WeChat/Telegram transfers)
-- Author: Manus AI
-- Date: 2025-11-05

CREATE TABLE IF NOT EXISTS chat_transfers (
    id VARCHAR(36) PRIMARY KEY,
    sender_id INTEGER NOT NULL,
    sender_address VARCHAR(42) NOT NULL,
    recipient_id INTEGER NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    token VARCHAR(10) NOT NULL,
    amount NUMERIC(20, 8) NOT NULL,
    message TEXT,
    chat_id VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    claimed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (recipient_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_transfers_sender ON chat_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_recipient ON chat_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_sender_address ON chat_transfers(sender_address);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_recipient_address ON chat_transfers(recipient_address);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_status ON chat_transfers(status);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_created_at ON chat_transfers(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_expires_at ON chat_transfers(expires_at);
CREATE INDEX IF NOT EXISTS idx_chat_transfers_chat_id ON chat_transfers(chat_id);
