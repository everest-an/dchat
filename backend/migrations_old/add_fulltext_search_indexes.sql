-- Full-Text Search Indexes Migration
-- 
-- This migration adds GIN indexes for full-text search on messages and users.
-- GIN (Generalized Inverted Index) is optimized for full-text search in PostgreSQL.
--
-- Author: Manus AI
-- Date: 2024-11-05

-- ============================================================================
-- Messages Full-Text Search Index
-- ============================================================================

-- Add tsvector column for message content (optional, for better performance)
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS content_tsvector tsvector;

-- Create trigger to automatically update tsvector column
CREATE OR REPLACE FUNCTION messages_content_trigger() RETURNS trigger AS $$
begin
  new.content_tsvector := to_tsvector('english', coalesce(new.content,''));
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvectorupdate ON messages;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON messages FOR EACH ROW EXECUTE FUNCTION messages_content_trigger();

-- Create GIN index on tsvector column
CREATE INDEX IF NOT EXISTS idx_messages_content_fts 
ON messages USING GIN (content_tsvector);

-- Alternative: Create GIN index directly on content column (simpler but slower)
-- CREATE INDEX IF NOT EXISTS idx_messages_content_fts 
-- ON messages USING GIN (to_tsvector('english', content));

-- Update existing rows
UPDATE messages SET content_tsvector = to_tsvector('english', coalesce(content,''));

-- ============================================================================
-- Users Search Indexes
-- ============================================================================

-- Create indexes for user search (username, email, wallet_address)
CREATE INDEX IF NOT EXISTS idx_users_username_search 
ON users USING GIN (to_tsvector('english', username));

CREATE INDEX IF NOT EXISTS idx_users_email_search 
ON users (email text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address_search 
ON users (wallet_address text_pattern_ops);

-- Create composite index for user search
CREATE INDEX IF NOT EXISTS idx_users_search_composite 
ON users (username, email, wallet_address);

-- ============================================================================
-- Messages Additional Indexes for Filtering
-- ============================================================================

-- Index for sender_id and receiver_id (for conversation filtering)
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver 
ON messages (sender_id, receiver_id);

CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender 
ON messages (receiver_id, sender_id);

-- Index for timestamp (for date range filtering)
CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
ON messages (timestamp DESC);

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_messages_search_composite 
ON messages (sender_id, receiver_id, timestamp DESC);

-- ============================================================================
-- Groups Search Indexes (if groups table exists)
-- ============================================================================

-- Create groups search indexes if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'groups') THEN
        -- Group name search
        CREATE INDEX IF NOT EXISTS idx_groups_name_fts 
        ON groups USING GIN (to_tsvector('english', name));
        
        -- Group description search
        CREATE INDEX IF NOT EXISTS idx_groups_description_fts 
        ON groups USING GIN (to_tsvector('english', description));
        
        RAISE NOTICE 'Groups search indexes created successfully';
    END IF;
END $$;

-- ============================================================================
-- Files Search Indexes (if files table exists)
-- ============================================================================

-- Create files search indexes if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'files') THEN
        -- File name search
        CREATE INDEX IF NOT EXISTS idx_files_name_search 
        ON files (file_name text_pattern_ops);
        
        -- File type search
        CREATE INDEX IF NOT EXISTS idx_files_type_search 
        ON files (file_type);
        
        -- Composite index for file search
        CREATE INDEX IF NOT EXISTS idx_files_search_composite 
        ON files (uploader_id, file_type, created_at DESC);
        
        RAISE NOTICE 'Files search indexes created successfully';
    END IF;
END $$;

-- ============================================================================
-- Search Statistics Table
-- ============================================================================

-- Create table to track search statistics (optional, for analytics)
CREATE TABLE IF NOT EXISTS search_statistics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    result_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_search_stats_user (user_id),
    INDEX idx_search_stats_created (created_at DESC)
);

-- ============================================================================
-- Verify Indexes
-- ============================================================================

-- Query to verify all search indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE indexname LIKE '%_fts' OR indexname LIKE '%_search%'
ORDER BY tablename, indexname;

-- ============================================================================
-- Performance Tips
-- ============================================================================

-- 1. Analyze tables after creating indexes
ANALYZE messages;
ANALYZE users;

-- 2. Monitor index usage
-- SELECT * FROM pg_stat_user_indexes WHERE indexrelname LIKE '%_fts%';

-- 3. Rebuild indexes if needed (maintenance)
-- REINDEX INDEX CONCURRENTLY idx_messages_content_fts;

-- 4. Update statistics regularly
-- ANALYZE messages;

-- ============================================================================
-- Rollback Script (if needed)
-- ============================================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS idx_messages_content_fts;
-- DROP INDEX IF EXISTS idx_users_username_search;
-- DROP INDEX IF EXISTS idx_users_email_search;
-- DROP INDEX IF EXISTS idx_users_wallet_address_search;
-- DROP INDEX IF EXISTS idx_users_search_composite;
-- DROP INDEX IF EXISTS idx_messages_sender_receiver;
-- DROP INDEX IF EXISTS idx_messages_receiver_sender;
-- DROP INDEX IF EXISTS idx_messages_timestamp;
-- DROP INDEX IF EXISTS idx_messages_search_composite;
-- DROP TRIGGER IF EXISTS tsvectorupdate ON messages;
-- DROP FUNCTION IF EXISTS messages_content_trigger();
-- ALTER TABLE messages DROP COLUMN IF EXISTS content_tsvector;
-- DROP TABLE IF EXISTS search_statistics;

COMMIT;
