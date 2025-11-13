-- Database Performance Indexes Migration
-- This migration adds critical indexes for production performance
-- Author: Manus AI
-- Date: 2024-11-13

-- ============================================================================
-- USER TABLE INDEXES
-- ============================================================================

-- Index for wallet address lookups (Web3 authentication)
CREATE INDEX IF NOT EXISTS idx_user_wallet_address ON users(wallet_address);

-- Index for email lookups (LinkedIn OAuth)
CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);

-- Index for username searches
CREATE INDEX IF NOT EXISTS idx_user_username ON users(username);

-- Index for online status queries
CREATE INDEX IF NOT EXISTS idx_user_online_status ON users(is_online);

-- Composite index for active users
CREATE INDEX IF NOT EXISTS idx_user_active ON users(is_online, last_seen DESC);


-- ============================================================================
-- MESSAGE TABLE INDEXES
-- ============================================================================

-- Index for conversation queries (most common query)
CREATE INDEX IF NOT EXISTS idx_message_conversation ON messages(conversation_id, created_at DESC);

-- Index for sender queries
CREATE INDEX IF NOT EXISTS idx_message_sender ON messages(sender_id, created_at DESC);

-- Index for recipient queries
CREATE INDEX IF NOT EXISTS idx_message_recipient ON messages(recipient_id, created_at DESC);

-- Index for unread messages
CREATE INDEX IF NOT EXISTS idx_message_unread ON messages(recipient_id, is_read, created_at DESC);

-- Index for message search by content (PostgreSQL full-text search)
-- Note: This uses GIN index for better text search performance
CREATE INDEX IF NOT EXISTS idx_message_content_search ON messages USING GIN(to_tsvector('english', content));

-- Composite index for conversation with read status
CREATE INDEX IF NOT EXISTS idx_message_conversation_read ON messages(conversation_id, is_read, created_at DESC);


-- ============================================================================
-- USER_PROFILE TABLE INDEXES
-- ============================================================================

-- Index for user profile lookups
CREATE INDEX IF NOT EXISTS idx_user_profile_user ON user_profiles(user_id);

-- Index for skill searches
CREATE INDEX IF NOT EXISTS idx_user_profile_skills ON user_profiles USING GIN(skills);

-- Index for location-based searches
CREATE INDEX IF NOT EXISTS idx_user_profile_location ON user_profiles(location);

-- Index for availability status
CREATE INDEX IF NOT EXISTS idx_user_profile_availability ON user_profiles(availability_status);


-- ============================================================================
-- PROJECT TABLE INDEXES
-- ============================================================================

-- Index for project owner queries
CREATE INDEX IF NOT EXISTS idx_project_owner ON projects(owner_id, created_at DESC);

-- Index for project status
CREATE INDEX IF NOT EXISTS idx_project_status ON projects(status);

-- Index for active projects
CREATE INDEX IF NOT EXISTS idx_project_active ON projects(status, created_at DESC) WHERE status = 'active';

-- Index for project search
CREATE INDEX IF NOT EXISTS idx_project_title_search ON projects USING GIN(to_tsvector('english', title));


-- ============================================================================
-- MATCHING TABLE INDEXES (New feature)
-- ============================================================================

-- Index for matching request queries
CREATE INDEX IF NOT EXISTS idx_matching_request_requester ON matching_requests(requester_id, created_at DESC);

-- Index for matching request status
CREATE INDEX IF NOT EXISTS idx_matching_request_status ON matching_requests(status, created_at DESC);

-- Index for matching results
CREATE INDEX IF NOT EXISTS idx_matching_result_request ON matching_results(request_id, match_score DESC);

-- Index for matching results by candidate
CREATE INDEX IF NOT EXISTS idx_matching_result_candidate ON matching_results(candidate_id, match_score DESC);

-- Index for skill relations (for related skill matching)
CREATE INDEX IF NOT EXISTS idx_skill_relation_skill1 ON skill_relations(skill1);
CREATE INDEX IF NOT EXISTS idx_skill_relation_skill2 ON skill_relations(skill2);

-- Composite index for bidirectional skill matching
CREATE INDEX IF NOT EXISTS idx_skill_relation_both ON skill_relations(skill1, skill2, similarity_score DESC);


-- ============================================================================
-- CUSTODIAL_WALLET TABLE INDEXES
-- ============================================================================

-- Index for wallet lookups by user
CREATE INDEX IF NOT EXISTS idx_custodial_wallet_user ON custodial_wallets(user_id);

-- Index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_custodial_wallet_address ON custodial_wallets(wallet_address);

-- Index for active wallets
CREATE INDEX IF NOT EXISTS idx_custodial_wallet_active ON custodial_wallets(is_active, created_at DESC);


-- ============================================================================
-- SUBSCRIPTION TABLE INDEXES
-- ============================================================================

-- Index for user subscription lookups
CREATE INDEX IF NOT EXISTS idx_subscription_user ON subscriptions(user_id);

-- Index for active subscriptions
CREATE INDEX IF NOT EXISTS idx_subscription_active ON subscriptions(status, end_date DESC) WHERE status = 'active';

-- Index for expiring subscriptions (for renewal reminders)
CREATE INDEX IF NOT EXISTS idx_subscription_expiring ON subscriptions(end_date) WHERE status = 'active';


-- ============================================================================
-- CHAT_TRANSFER TABLE INDEXES
-- ============================================================================

-- Index for sender transfers
CREATE INDEX IF NOT EXISTS idx_chat_transfer_sender ON chat_transfers(sender_id, created_at DESC);

-- Index for recipient transfers
CREATE INDEX IF NOT EXISTS idx_chat_transfer_recipient ON chat_transfers(recipient_id, created_at DESC);

-- Index for pending transfers
CREATE INDEX IF NOT EXISTS idx_chat_transfer_pending ON chat_transfers(status, created_at DESC) WHERE status = 'pending';

-- Index for transaction hash lookups
CREATE INDEX IF NOT EXISTS idx_chat_transfer_tx_hash ON chat_transfers(transaction_hash);


-- ============================================================================
-- NONCE_TRACKER TABLE INDEXES
-- ============================================================================

-- Index for nonce lookups by wallet
CREATE INDEX IF NOT EXISTS idx_nonce_tracker_wallet ON nonce_trackers(wallet_address);

-- Index for recent nonces (for cleanup)
CREATE INDEX IF NOT EXISTS idx_nonce_tracker_created ON nonce_trackers(created_at);


-- ============================================================================
-- PERFORMANCE ANALYSIS
-- ============================================================================

-- After adding indexes, run ANALYZE to update statistics
ANALYZE users;
ANALYZE messages;
ANALYZE user_profiles;
ANALYZE projects;
ANALYZE matching_requests;
ANALYZE matching_results;
ANALYZE skill_relations;
ANALYZE custodial_wallets;
ANALYZE subscriptions;
ANALYZE chat_transfers;
ANALYZE nonce_trackers;


-- ============================================================================
-- INDEX USAGE MONITORING
-- ============================================================================

-- Query to check index usage (PostgreSQL)
-- Run this periodically to ensure indexes are being used:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
*/

-- Query to find unused indexes (PostgreSQL)
-- Run this to identify indexes that can be removed:
/*
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexname NOT LIKE 'pg_toast%'
ORDER BY tablename, indexname;
*/
