package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func newTestJWT() *auth.JWTService {
	return auth.NewJWTService(&config.JWTConfig{
		SecretKey:       "test-secret-key-at-least-32-chars!!",
		ExpirationHours: 24,
	})
}

func setupRouter(jwtSvc *auth.JWTService) *gin.Engine {
	r := gin.New()
	r.GET("/protected", AuthMiddleware(jwtSvc), func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		wallet, _ := c.Get("wallet_address")
		c.JSON(200, gin.H{
			"user_id":        userID,
			"wallet_address": wallet,
		})
	})
	return r
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	jwtSvc := newTestJWT()
	router := setupRouter(jwtSvc)

	token, _ := jwtSvc.GenerateToken(42, "0xabcdef1234567890abcdef1234567890abcdef12", "user")

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var body map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &body)
	if uint(body["user_id"].(float64)) != 42 {
		t.Errorf("expected user_id 42, got %v", body["user_id"])
	}
}

func TestAuthMiddleware_MissingHeader(t *testing.T) {
	jwtSvc := newTestJWT()
	router := setupRouter(jwtSvc)

	req := httptest.NewRequest("GET", "/protected", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var resp response.APIResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Success {
		t.Error("expected success=false")
	}
}

func TestAuthMiddleware_InvalidScheme(t *testing.T) {
	jwtSvc := newTestJWT()
	router := setupRouter(jwtSvc)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Basic some-token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	jwtSvc := newTestJWT()
	router := setupRouter(jwtSvc)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-string")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}

	var resp response.APIResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.Error == nil || resp.Error.Code != response.ErrCodeTokenInvalid {
		t.Errorf("expected error code %s", response.ErrCodeTokenInvalid)
	}
}

func TestAuthMiddleware_WrongSecret(t *testing.T) {
	jwtSvc := newTestJWT()
	router := setupRouter(jwtSvc)

	// Generate token with a different secret.
	otherJWT := auth.NewJWTService(&config.JWTConfig{
		SecretKey:       "other-secret-key-at-least-32-chars!!",
		ExpirationHours: 24,
	})
	token, _ := otherJWT.GenerateToken(1, "0x1234567890abcdef1234567890abcdef12345678", "user")

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestAuthMiddleware_EmptyBearer(t *testing.T) {
	jwtSvc := newTestJWT()
	router := setupRouter(jwtSvc)

	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer ")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}
