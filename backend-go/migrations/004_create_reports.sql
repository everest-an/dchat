-- Migration: Create report table for user reporting and content moderation
-- Created: 2026-02-18

CREATE TABLE IF NOT EXISTS report (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL,
    reported_user_id INTEGER NOT NULL,
    reported_message_id INTEGER,
    reason VARCHAR(30) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewer_id INTEGER,
    resolution_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,

    CONSTRAINT chk_report_reason CHECK (
        reason IN ('spam', 'harassment', 'inappropriate', 'fraud', 'other')
    ),
    CONSTRAINT chk_report_status CHECK (
        status IN ('pending', 'reviewing', 'resolved', 'dismissed')
    )
);

-- Indexes
CREATE INDEX idx_report_reporter_id ON report(reporter_id);
CREATE INDEX idx_report_reported_user_id ON report(reported_user_id);
CREATE INDEX idx_report_reported_message_id ON report(reported_message_id) WHERE reported_message_id IS NOT NULL;
CREATE INDEX idx_report_status ON report(status);
CREATE INDEX idx_report_created_at ON report(created_at DESC);
CREATE INDEX idx_report_deleted_at ON report(deleted_at) WHERE deleted_at IS NOT NULL;

-- Comments
COMMENT ON TABLE report IS 'Stores user-submitted reports for content moderation';
COMMENT ON COLUMN report.reason IS 'Report reason: spam, harassment, inappropriate, fraud, other';
COMMENT ON COLUMN report.status IS 'Report lifecycle status: pending, reviewing, resolved, dismissed';
