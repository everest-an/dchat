-- Database Optimization and Indexing Script
-- This script adds indexes and optimizations for production performance

-- ============= Users Table =============

-- Index on wallet_address for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);

-- Index on created_at for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Index on public_key for encryption lookups
CREATE INDEX IF NOT EXISTS idx_users_public_key ON users(public_key) WHERE public_key IS NOT NULL;

-- ============= Messages Table =============

-- Composite index for sender-receiver queries
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);

-- Composite index for receiver-sender queries (reverse direction)
CREATE INDEX IF NOT EXISTS idx_messages_receiver_sender ON messages(receiver_id, sender_id);

-- Index on timestamp for chronological ordering
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);

-- Index on message status for filtering
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Composite index for unread messages query
CREATE INDEX IF NOT EXISTS idx_messages_receiver_status ON messages(receiver_id, status) WHERE status = 'unread';

-- ============= Groups Table (if exists) =============

-- Index on group owner
CREATE INDEX IF NOT EXISTS idx_groups_owner ON groups(owner_id);

-- Index on group creation time
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at);

-- Index on group type/visibility
CREATE INDEX IF NOT EXISTS idx_groups_is_public ON groups(is_public);

-- ============= Group Members Table (if exists) =============

-- Composite index for group membership queries
CREATE INDEX IF NOT EXISTS idx_group_members_group_user ON group_members(group_id, user_id);

-- Index for user's groups query
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- Index on join date
CREATE INDEX IF NOT EXISTS idx_group_members_joined_at ON group_members(joined_at);

-- ============= Sessions Table (if using database sessions) =============

-- Index on session token for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Index on user_id for user session queries
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- Index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============= Notifications Table (if exists) =============

-- Composite index for user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- Index on creation time
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============= Files/Attachments Table (if exists) =============

-- Index on uploader
CREATE INDEX IF NOT EXISTS idx_files_uploader_id ON files(uploader_id);

-- Index on IPFS hash for lookups
CREATE INDEX IF NOT EXISTS idx_files_ipfs_hash ON files(ipfs_hash);

-- Index on upload time
CREATE INDEX IF NOT EXISTS idx_files_uploaded_at ON files(uploaded_at);

-- ============= Performance Optimizations =============

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE messages;
ANALYZE groups;
ANALYZE group_members;

-- Vacuum to reclaim space and optimize
VACUUM ANALYZE;

-- ============= Comments =============

COMMENT ON INDEX idx_users_wallet_address IS 'Fast lookup for wallet-based authentication';
COMMENT ON INDEX idx_messages_sender_receiver IS 'Optimizes direct message queries';
COMMENT ON INDEX idx_messages_receiver_status IS 'Optimizes unread message count queries';
COMMENT ON INDEX idx_group_members_group_user IS 'Optimizes group membership checks';

-- ============= Query Performance Tips =============

-- 1. Always use indexed columns in WHERE clauses
-- 2. Avoid SELECT * - specify only needed columns
-- 3. Use LIMIT for pagination
-- 4. Use prepared statements to prevent SQL injection
-- 5. Monitor slow queries with EXPLAIN ANALYZE
-- 6. Consider partitioning for very large tables
-- 7. Use connection pooling
-- 8. Cache frequently accessed data in Redis

-- ============= Monitoring Queries =============

-- Check index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- Find missing indexes:
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
-- ORDER BY abs(correlation) DESC;

-- Check table sizes:
-- SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
