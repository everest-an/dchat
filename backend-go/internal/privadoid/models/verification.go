package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

// VerificationType represents the type of verification
type VerificationType string

const (
	VerificationCompany   VerificationType = "company"
	VerificationProject   VerificationType = "project"
	VerificationSkill     VerificationType = "skill"
	VerificationEducation VerificationType = "education"
	VerificationHumanity  VerificationType = "humanity"
)

// VerificationStatus represents the status of a verification
type VerificationStatus string

const (
	StatusActive  VerificationStatus = "active"
	StatusExpired VerificationStatus = "expired"
	StatusRevoked VerificationStatus = "revoked"
)

// JSONB is a custom type for PostgreSQL JSONB fields
type JSONB map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	
	return json.Unmarshal(bytes, j)
}

// UserVerification represents a Privado ID verification for a user
type UserVerification struct {
	ID                int64              `json:"id" db:"id"`
	UserID            int64              `json:"user_id" db:"user_id"`
	VerificationType  VerificationType   `json:"verification_type" db:"verification_type"`
	CredentialSchema  string             `json:"credential_schema" db:"credential_schema"`
	IssuerDID         string             `json:"issuer_did" db:"issuer_did"`
	VerifiedAt        time.Time          `json:"verified_at" db:"verified_at"`
	ExpiresAt         *time.Time         `json:"expires_at,omitempty" db:"expires_at"`
	ProofData         JSONB              `json:"proof_data,omitempty" db:"proof_data"`
	Status            VerificationStatus `json:"status" db:"status"`
	Metadata          JSONB              `json:"metadata,omitempty" db:"metadata"`
	CreatedAt         time.Time          `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at" db:"updated_at"`
}

// VerificationRequest represents a request to create a verification
type VerificationRequest struct {
	Type          VerificationType   `json:"type" binding:"required"`
	RequiredClaim map[string]interface{} `json:"required_claim"`
	Schema        string             `json:"schema"`
	AllowedIssuers []string          `json:"allowed_issuers"`
}

// VerificationResponse represents the response after creating a verification request
type VerificationResponse struct {
	RequestID   string `json:"request_id"`
	QRCode      string `json:"qr_code"`
	DeepLink    string `json:"deep_link"`
	UniversalLink string `json:"universal_link"`
	ExpiresAt   time.Time `json:"expires_at"`
}

// ProofSubmission represents a proof submitted by a user
type ProofSubmission struct {
	RequestID string                 `json:"request_id" binding:"required"`
	Proof     map[string]interface{} `json:"proof" binding:"required"`
	PublicSignals []string           `json:"public_signals"`
}

// VerificationStatus represents the status of a verification request
type VerificationRequestStatus struct {
	RequestID string `json:"request_id"`
	Status    string `json:"status"` // "pending", "verified", "failed"
	Message   string `json:"message,omitempty"`
	VerificationID int64 `json:"verification_id,omitempty"`
}

// IsExpired checks if the verification has expired
func (v *UserVerification) IsExpired() bool {
	if v.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*v.ExpiresAt)
}

// IsActive checks if the verification is currently active
func (v *UserVerification) IsActive() bool {
	return v.Status == StatusActive && !v.IsExpired()
}
