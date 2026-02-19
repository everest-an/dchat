-- Migration: Create group-related tables
-- Created: 2026-02-18

-- Groups table
CREATE TABLE IF NOT EXISTS "group" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    avatar_url VARCHAR(500),
    owner_id INTEGER NOT NULL,
    max_members INTEGER NOT NULL DEFAULT 256,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    require_approval BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_group_owner_id ON "group"(owner_id);
CREATE INDEX idx_group_deleted_at ON "group"(deleted_at) WHERE deleted_at IS NOT NULL;

-- Group members table
CREATE TABLE IF NOT EXISTS group_member (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    nickname VARCHAR(100),
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until TIMESTAMP,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_member_role CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE UNIQUE INDEX idx_group_user ON group_member(group_id, user_id);
CREATE INDEX idx_group_member_group_id ON group_member(group_id);
CREATE INDEX idx_group_member_user_id ON group_member(user_id);

-- Group announcements table
CREATE TABLE IF NOT EXISTS group_announcement (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_announcement_group_id ON group_announcement(group_id);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_message (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text',
    encrypted BOOLEAN NOT NULL DEFAULT FALSE,
    recalled BOOLEAN NOT NULL DEFAULT FALSE,
    recalled_at TIMESTAMP,
    edited BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at TIMESTAMP,
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_group_message_group_id ON group_message(group_id);
CREATE INDEX idx_group_message_sender_id ON group_message(sender_id);
CREATE INDEX idx_group_message_created_at ON group_message(group_id, created_at DESC);

-- Group join requests table
CREATE TABLE IF NOT EXISTS group_join_request (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewer_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_join_request_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX idx_group_join_request_group_id ON group_join_request(group_id);
CREATE INDEX idx_group_join_request_user_id ON group_join_request(user_id);
CREATE INDEX idx_group_join_request_status ON group_join_request(group_id, status);

-- Comments
COMMENT ON TABLE "group" IS 'Chat groups with role-based management';
COMMENT ON TABLE group_member IS 'Group membership with roles: owner, admin, member';
COMMENT ON TABLE group_announcement IS 'Pinned announcements within groups';
COMMENT ON TABLE group_message IS 'Messages sent within group chats';
COMMENT ON TABLE group_join_request IS 'Pending requests to join groups that require approval';
