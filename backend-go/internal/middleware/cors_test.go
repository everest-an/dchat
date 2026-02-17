package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/gin-gonic/gin"
)

func setupCORSRouter(cfg *config.CORSConfig) *gin.Engine {
	r := gin.New()
	r.Use(CORSMiddleware(cfg))
	r.GET("/test", func(c *gin.Context) {
		c.JSON(200, gin.H{"ok": true})
	})
	return r
}

func TestCORS_AllowedOrigin(t *testing.T) {
	cfg := &config.CORSConfig{
		AllowedOrigins: []string{"http://localhost:3000", "https://dchat.pro"},
		AllowedMethods: []string{"GET", "POST"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
		MaxAge:         3600,
	}
	router := setupCORSRouter(cfg)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "http://localhost:3000")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	origin := w.Header().Get("Access-Control-Allow-Origin")
	if origin != "http://localhost:3000" {
		t.Errorf("expected CORS origin 'http://localhost:3000', got '%s'", origin)
	}
}

func TestCORS_DisallowedOrigin(t *testing.T) {
	cfg := &config.CORSConfig{
		AllowedOrigins: []string{"https://dchat.pro"},
		AllowedMethods: []string{"GET"},
		AllowedHeaders: []string{"Content-Type"},
		MaxAge:         3600,
	}
	router := setupCORSRouter(cfg)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://evil.com")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	origin := w.Header().Get("Access-Control-Allow-Origin")
	if origin != "" {
		t.Errorf("expected empty CORS origin for disallowed origin, got '%s'", origin)
	}
}

func TestCORS_Preflight(t *testing.T) {
	cfg := &config.CORSConfig{
		AllowedOrigins: []string{"https://dchat.pro"},
		AllowedMethods: []string{"GET", "POST", "PUT"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
		MaxAge:         7200,
	}
	router := setupCORSRouter(cfg)

	req := httptest.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", "https://dchat.pro")
	req.Header.Set("Access-Control-Request-Method", "POST")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for preflight, got %d", w.Code)
	}
	methods := w.Header().Get("Access-Control-Allow-Methods")
	if methods == "" {
		t.Error("expected Access-Control-Allow-Methods header")
	}
	maxAge := w.Header().Get("Access-Control-Max-Age")
	if maxAge != "7200" {
		t.Errorf("expected max-age 7200, got %s", maxAge)
	}
}

func TestCORS_WildcardOrigin(t *testing.T) {
	cfg := &config.CORSConfig{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET"},
		AllowedHeaders: []string{"Content-Type"},
		MaxAge:         3600,
	}
	router := setupCORSRouter(cfg)

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://anything.com")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	origin := w.Header().Get("Access-Control-Allow-Origin")
	if origin != "https://anything.com" {
		t.Errorf("expected wildcard to allow any origin, got '%s'", origin)
	}
}
