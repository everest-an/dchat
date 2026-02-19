-- Create mentions table for @mention tracking
CREATE TABLE IF NOT EXISTS mention (
    id              SERIAL PRIMARY KEY,
    message_id      INTEGER NOT NULL REFERENCES group_message(id) ON DELETE CASCADE,
    group_id        INTEGER NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    mentioned_user_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
    is_all          BOOLEAN NOT NULL DEFAULT FALSE,
    read            BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mention_mentioned_user ON mention(mentioned_user_id);
CREATE INDEX idx_mention_group ON mention(group_id);
CREATE INDEX idx_mention_message ON mention(message_id);
CREATE INDEX idx_mention_unread ON mention(mentioned_user_id, read) WHERE read = false;
