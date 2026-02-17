package config

import (
	"os"
	"testing"
)

// setEnv sets environment variables for a test and returns a cleanup function.
func setEnv(t *testing.T, vars map[string]string) {
	t.Helper()
	for k, v := range vars {
		t.Setenv(k, v)
	}
}

func minimalEnv() map[string]string {
	return map[string]string{
		"DB_HOST":     "localhost",
		"DB_PORT":     "5432",
		"DB_USER":     "testuser",
		"DB_PASSWORD": "testpass",
		"DB_NAME":     "testdb",
		"JWT_SECRET":  "this-is-a-secret-key-at-least-32-chars!!",
		"REDIS_HOST":  "localhost",
	}
}

func TestLoad_MinimalEnv(t *testing.T) {
	setEnv(t, minimalEnv())
	// Prevent loading .env file during tests.
	os.Setenv("GO_ENV", "test")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if cfg.Database.Host != "localhost" {
		t.Errorf("expected DB_HOST localhost, got %s", cfg.Database.Host)
	}
	if cfg.Database.Port != 5432 {
		t.Errorf("expected DB_PORT 5432, got %d", cfg.Database.Port)
	}
	if cfg.JWT.SecretKey != "this-is-a-secret-key-at-least-32-chars!!" {
		t.Errorf("unexpected JWT secret")
	}
	if cfg.Server.APIPort != "8080" {
		t.Errorf("expected default API port 8080, got %s", cfg.Server.APIPort)
	}
}

func TestLoad_MissingRequiredDB(t *testing.T) {
	// Only set JWT_SECRET but not DB_HOST.
	t.Setenv("JWT_SECRET", "this-is-a-secret-key-at-least-32-chars!!")
	t.Setenv("DB_PASSWORD", "pass")
	t.Setenv("DB_NAME", "db")
	t.Setenv("REDIS_HOST", "localhost")
	// DB_HOST is empty.

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for missing DB_HOST, got nil")
	}
}

func TestLoad_JWTSecretTooShort(t *testing.T) {
	env := minimalEnv()
	env["JWT_SECRET"] = "short"
	setEnv(t, env)

	_, err := Load()
	if err == nil {
		t.Fatal("expected error for short JWT_SECRET, got nil")
	}
}

func TestLoad_CustomPorts(t *testing.T) {
	env := minimalEnv()
	env["API_PORT"] = "9090"
	env["WEBSOCKET_PORT"] = "9091"
	setEnv(t, env)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if cfg.Server.APIPort != "9090" {
		t.Errorf("expected API port 9090, got %s", cfg.Server.APIPort)
	}
	if cfg.Server.WebSocketPort != "9091" {
		t.Errorf("expected WebSocket port 9091, got %s", cfg.Server.WebSocketPort)
	}
}

func TestLoad_CORSParsing(t *testing.T) {
	env := minimalEnv()
	env["CORS_ALLOWED_ORIGINS"] = "http://localhost:3000,https://dchat.pro"
	setEnv(t, env)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if len(cfg.CORS.AllowedOrigins) != 2 {
		t.Errorf("expected 2 CORS origins, got %d", len(cfg.CORS.AllowedOrigins))
	}
}

func TestLoad_DatabaseDefaults(t *testing.T) {
	env := minimalEnv()
	setEnv(t, env)

	cfg, err := Load()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if cfg.Database.SSLMode != "require" {
		t.Errorf("expected default SSLMode 'require', got %s", cfg.Database.SSLMode)
	}
	if cfg.Database.MaxOpenConns != 25 {
		t.Errorf("expected default MaxOpenConns 25, got %d", cfg.Database.MaxOpenConns)
	}
	if cfg.Database.MaxIdleConns != 10 {
		t.Errorf("expected default MaxIdleConns 10, got %d", cfg.Database.MaxIdleConns)
	}
}
