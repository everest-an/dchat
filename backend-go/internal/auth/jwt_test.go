package auth

import (
	"testing"
	"time"

	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

func newTestJWTService(secret string, hours int) *JWTService {
	return NewJWTService(&config.JWTConfig{
		SecretKey:       secret,
		ExpirationHours: hours,
	})
}

func TestGenerateToken_Success(t *testing.T) {
	svc := newTestJWTService("test-secret-key-at-least-32-chars!!", 24)
	token, err := svc.GenerateToken(1, "0xabcdef1234567890abcdef1234567890abcdef12", "user")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if token == "" {
		t.Fatal("expected non-empty token")
	}
}

func TestValidateToken_Success(t *testing.T) {
	svc := newTestJWTService("test-secret-key-at-least-32-chars!!", 24)
	wallet := "0xabcdef1234567890abcdef1234567890abcdef12"

	token, err := svc.GenerateToken(42, wallet, "user")
	if err != nil {
		t.Fatalf("generate failed: %v", err)
	}

	claims, err := svc.ValidateToken(token)
	if err != nil {
		t.Fatalf("validate failed: %v", err)
	}
	if claims.UserID != 42 {
		t.Errorf("expected UserID 42, got %d", claims.UserID)
	}
	if claims.WalletAddress != wallet {
		t.Errorf("expected wallet %s, got %s", wallet, claims.WalletAddress)
	}
}

func TestValidateToken_InvalidSecret(t *testing.T) {
	svc1 := newTestJWTService("secret-one-at-least-32-characters!!", 24)
	svc2 := newTestJWTService("secret-two-at-least-32-characters!!", 24)

	token, _ := svc1.GenerateToken(1, "0x1234567890abcdef1234567890abcdef12345678", "user")
	_, err := svc2.ValidateToken(token)
	if err == nil {
		t.Fatal("expected error for wrong secret, got nil")
	}
}

func TestValidateToken_ExpiredToken(t *testing.T) {
	secret := "test-secret-key-at-least-32-chars!!"
	svc := &JWTService{
		secretKey:       []byte(secret),
		expirationHours: 1,
	}

	// Manually create an expired token.
	claims := Claims{
		UserID:        1,
		WalletAddress: "0x1234567890abcdef1234567890abcdef12345678",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, _ := token.SignedString([]byte(secret))

	_, err := svc.ValidateToken(tokenStr)
	if err == nil {
		t.Fatal("expected error for expired token, got nil")
	}
}

func TestValidateToken_MalformedToken(t *testing.T) {
	svc := newTestJWTService("test-secret-key-at-least-32-chars!!", 24)
	_, err := svc.ValidateToken("not-a-valid-jwt-token")
	if err == nil {
		t.Fatal("expected error for malformed token, got nil")
	}
}

func TestValidateToken_EmptyToken(t *testing.T) {
	svc := newTestJWTService("test-secret-key-at-least-32-chars!!", 24)
	_, err := svc.ValidateToken("")
	if err == nil {
		t.Fatal("expected error for empty token, got nil")
	}
}

func TestGenerateToken_DifferentUsersGetDifferentTokens(t *testing.T) {
	svc := newTestJWTService("test-secret-key-at-least-32-chars!!", 24)
	t1, _ := svc.GenerateToken(1, "0x1111111111111111111111111111111111111111", "user")
	t2, _ := svc.GenerateToken(2, "0x2222222222222222222222222222222222222222", "user")
	if t1 == t2 {
		t.Error("expected different tokens for different users")
	}
}
