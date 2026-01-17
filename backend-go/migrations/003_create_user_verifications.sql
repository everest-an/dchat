-- Migration: Create user_verifications table for Privado ID integration
-- Created: 2026-01-06

-- Create user_verifications table
CREATE TABLE IF NOT EXISTS user_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL,
    credential_schema VARCHAR(255) NOT NULL,
    issuer_did TEXT NOT NULL,
    verified_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP,
    proof_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_verification_type CHECK (
        verification_type IN ('company', 'project', 'skill', 'education', 'humanity')
    ),
    CONSTRAINT chk_status CHECK (
        status IN ('active', 'expired', 'revoked')
    )
);

-- Create indexes for better query performance
CREATE INDEX idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_type ON user_verifications(verification_type);
CREATE INDEX idx_user_verifications_status ON user_verifications(status);
CREATE INDEX idx_user_verifications_verified_at ON user_verifications(verified_at DESC);

-- Create composite index for common queries
CREATE INDEX idx_user_verifications_user_type_status ON user_verifications(user_id, verification_type, status);

-- Add comment
COMMENT ON TABLE user_verifications IS 'Stores Privado ID verifications for users';
COMMENT ON COLUMN user_verifications.verification_type IS 'Type of verification: company, project, skill, education, humanity';
COMMENT ON COLUMN user_verifications.credential_schema IS 'IPFS URL or identifier of the credential schema';
COMMENT ON COLUMN user_verifications.issuer_did IS 'Decentralized Identifier (DID) of the credential issuer';
COMMENT ON COLUMN user_verifications.proof_data IS 'JSON data containing the zero-knowledge proof';
COMMENT ON COLUMN user_verifications.status IS 'Status of the verification: active, expired, revoked';
COMMENT ON COLUMN user_verifications.metadata IS 'Additional metadata about the verification';
