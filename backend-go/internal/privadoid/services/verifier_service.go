package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/everest-an/dchat-backend/internal/privadoid"
	"github.com/everest-an/dchat-backend/internal/privadoid/models"
)

// VerifierService handles Privado ID verification operations
type VerifierService struct {
	db     *sql.DB
	config *privadoid.Config
	// In a full implementation, we would add the Privado ID verifier here
	// verifier *auth.Verifier
}

// NewVerifierService creates a new verifier service
func NewVerifierService(db *sql.DB, config *privadoid.Config) *VerifierService {
	return &VerifierService{
		db:     db,
		config: config,
	}
}

// CreateVerificationRequest creates a new verification request
func (s *VerifierService) CreateVerificationRequest(
	ctx context.Context,
	userID int64,
	req *models.VerificationRequest,
) (*models.VerificationResponse, error) {
	// Generate unique request ID
	requestID, err := generateRequestID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate request ID: %w", err)
	}

	// Build the authorization request based on Privado ID spec
	authRequest := s.buildAuthorizationRequest(requestID, req)

	// Generate QR code data (JSON string of the auth request)
	qrData, err := json.Marshal(authRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal auth request: %w", err)
	}

	// Encode QR data as base64
	qrCode := base64.StdEncoding.EncodeToString(qrData)

	// Generate deep link and universal link
	deepLink := fmt.Sprintf("iden3comm://?i_m=%s", base64.URLEncoding.EncodeToString(qrData))
	universalLink := fmt.Sprintf("https://wallet.privado.id/#/request/%s", requestID)

	// Store the pending request in cache/database (simplified for now)
	// In production, store in Redis with expiration
	expiresAt := time.Now().Add(time.Duration(s.config.RequestExpiration) * time.Second)

	return &models.VerificationResponse{
		RequestID:     requestID,
		QRCode:        qrCode,
		DeepLink:      deepLink,
		UniversalLink: universalLink,
		ExpiresAt:     expiresAt,
	}, nil
}

// VerifyProof verifies a zero-knowledge proof submitted by a user
func (s *VerifierService) VerifyProof(
	ctx context.Context,
	userID int64,
	submission *models.ProofSubmission,
) (*models.UserVerification, error) {
	// In a full implementation, this would use the Privado ID verifier library
	// to verify the zero-knowledge proof against the blockchain state
	
	// For now, we'll create a placeholder verification
	// TODO: Implement actual proof verification using github.com/iden3/go-iden3-auth
	
	// Extract verification details from proof
	verificationType := models.VerificationCompany // Extract from proof
	credentialSchema := "ipfs://QmExample" // Extract from proof
	issuerDID := "did:polygonid:polygon:amoy:..." // Extract from proof
	
	// Create verification record
	verification := &models.UserVerification{
		UserID:           userID,
		VerificationType: verificationType,
		CredentialSchema: credentialSchema,
		IssuerDID:        issuerDID,
		VerifiedAt:       time.Now(),
		Status:           models.StatusActive,
		ProofData:        models.JSONB(submission.Proof),
		Metadata:         models.JSONB{
			"request_id": submission.RequestID,
		},
	}

	// Insert into database
	query := `
		INSERT INTO user_verifications (
			user_id, verification_type, credential_schema, issuer_did,
			verified_at, proof_data, status, metadata, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	err := s.db.QueryRowContext(
		ctx, query,
		verification.UserID,
		verification.VerificationType,
		verification.CredentialSchema,
		verification.IssuerDID,
		verification.VerifiedAt,
		verification.ProofData,
		verification.Status,
		verification.Metadata,
	).Scan(&verification.ID, &verification.CreatedAt, &verification.UpdatedAt)

	if err != nil {
		return nil, fmt.Errorf("failed to insert verification: %w", err)
	}

	return verification, nil
}

// GetUserVerifications retrieves all verifications for a user
func (s *VerifierService) GetUserVerifications(
	ctx context.Context,
	userID int64,
) ([]*models.UserVerification, error) {
	query := `
		SELECT id, user_id, verification_type, credential_schema, issuer_did,
			   verified_at, expires_at, proof_data, status, metadata,
			   created_at, updated_at
		FROM user_verifications
		WHERE user_id = $1
		ORDER BY verified_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query verifications: %w", err)
	}
	defer rows.Close()

	var verifications []*models.UserVerification
	for rows.Next() {
		v := &models.UserVerification{}
		err := rows.Scan(
			&v.ID, &v.UserID, &v.VerificationType, &v.CredentialSchema,
			&v.IssuerDID, &v.VerifiedAt, &v.ExpiresAt, &v.ProofData,
			&v.Status, &v.Metadata, &v.CreatedAt, &v.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan verification: %w", err)
		}
		verifications = append(verifications, v)
	}

	return verifications, nil
}

// DeleteVerification deletes a verification
func (s *VerifierService) DeleteVerification(
	ctx context.Context,
	userID, verificationID int64,
) error {
	query := `
		DELETE FROM user_verifications
		WHERE id = $1 AND user_id = $2
	`

	result, err := s.db.ExecContext(ctx, query, verificationID, userID)
	if err != nil {
		return fmt.Errorf("failed to delete verification: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("verification not found")
	}

	return nil
}

// buildAuthorizationRequest builds a Privado ID authorization request
func (s *VerifierService) buildAuthorizationRequest(
	requestID string,
	req *models.VerificationRequest,
) map[string]interface{} {
	// Build according to Privado ID spec
	// https://docs.privado.id/docs/verifier/verification-library/request/
	
	allowedIssuers := req.AllowedIssuers
	if len(allowedIssuers) == 0 {
		allowedIssuers = []string{"*"} // Allow any issuer
	}

	return map[string]interface{}{
		"id":   requestID,
		"typ":  "application/iden3comm-plain-json",
		"type": "https://iden3-communication.io/authorization/1.0/request",
		"thid": requestID,
		"body": map[string]interface{}{
			"callbackUrl": s.config.CallbackURL,
			"reason":      fmt.Sprintf("Verify your %s", req.Type),
			"scope": []map[string]interface{}{
				{
					"id":        1,
					"circuitId": "credentialAtomicQuerySigV2",
					"query": map[string]interface{}{
						"allowedIssuers":   allowedIssuers,
						"type":             string(req.Type),
						"context":          req.Schema,
						"credentialSubject": req.RequiredClaim,
					},
				},
			},
		},
	}
}

// generateRequestID generates a unique request ID
func generateRequestID() (string, error) {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("req-%x", b), nil
}
