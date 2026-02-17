package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all application configuration loaded from environment variables.
type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	Web3      Web3Config
	CORS      CORSConfig
	Log       LogConfig
	PrivadoID PrivadoIDConfig
}

// ServerConfig holds HTTP and WebSocket server settings.
type ServerConfig struct {
	APIPort       string
	WebSocketPort string
	Environment   string // "development", "staging", "production"
	ReadTimeout   time.Duration
	WriteTimeout  time.Duration
	IdleTimeout   time.Duration
}

// DatabaseConfig holds PostgreSQL connection settings.
type DatabaseConfig struct {
	Host            string
	Port            int
	User            string
	Password        string
	Name            string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// RedisConfig holds Redis connection settings.
type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
	PoolSize int
}

// JWTConfig holds JWT authentication settings.
type JWTConfig struct {
	SecretKey       string
	ExpirationHours int
	Issuer          string
}

// Web3Config holds blockchain-related settings.
type Web3Config struct {
	RPCURL          string
	ChainID         int64
	ContractAddress string
	NonceExpiry     time.Duration
}

// CORSConfig holds CORS policy settings.
type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	MaxAge         int
}

// LogConfig holds logging settings.
type LogConfig struct {
	Level  string // "debug", "info", "warn", "error"
	Format string // "json", "text"
}

// PrivadoIDConfig holds Privado ID verification settings.
type PrivadoIDConfig struct {
	RPCURL            string
	StateContract     string
	ResolverPrefix    string
	IPFSGateway       string
	CircuitsDir       string
	CallbackURL       string
	RequestExpiration int64
}

// DSN returns the PostgreSQL connection string.
func (d *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Password, d.Name, d.SSLMode,
	)
}

// RedisAddr returns the Redis address in host:port format.
func (r *RedisConfig) RedisAddr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

// IsProd returns true if the environment is production.
func (c *Config) IsProd() bool {
	return c.Server.Environment == "production"
}

// Load reads configuration from environment variables with validation.
// It attempts to load a .env file if present but does not fail if missing.
func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Server: ServerConfig{
			APIPort:       envStr("API_PORT", "8080"),
			WebSocketPort: envStr("WEBSOCKET_PORT", "8081"),
			Environment:   envStr("ENVIRONMENT", "development"),
			ReadTimeout:   envDuration("SERVER_READ_TIMEOUT", 15*time.Second),
			WriteTimeout:  envDuration("SERVER_WRITE_TIMEOUT", 15*time.Second),
			IdleTimeout:   envDuration("SERVER_IDLE_TIMEOUT", 60*time.Second),
		},
		Database: DatabaseConfig{
			Host:            envStr("DB_HOST", ""),
			Port:            envInt("DB_PORT", 5432),
			User:            envStr("DB_USER", ""),
			Password:        envStr("DB_PASSWORD", ""),
			Name:            envStr("DB_NAME", ""),
			SSLMode:         envStr("DB_SSLMODE", "require"),
			MaxOpenConns:    envInt("DB_MAX_OPEN_CONNS", 25),
			MaxIdleConns:    envInt("DB_MAX_IDLE_CONNS", 10),
			ConnMaxLifetime: envDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
		},
		Redis: RedisConfig{
			Host:     envStr("REDIS_HOST", "localhost"),
			Port:     envInt("REDIS_PORT", 6379),
			Password: envStr("REDIS_PASSWORD", ""),
			DB:       envInt("REDIS_DB", 0),
			PoolSize: envInt("REDIS_POOL_SIZE", 100),
		},
		JWT: JWTConfig{
			SecretKey:       envStr("JWT_SECRET", ""),
			ExpirationHours: envInt("JWT_EXPIRATION_HOURS", 24),
			Issuer:          envStr("JWT_ISSUER", "dchat"),
		},
		Web3: Web3Config{
			RPCURL:          envStr("RPC_URL", ""),
			ChainID:         int64(envInt("CHAIN_ID", 11155111)),
			ContractAddress: envStr("CONTRACT_ADDRESS", ""),
			NonceExpiry:     envDuration("NONCE_EXPIRY", 5*time.Minute),
		},
		CORS: CORSConfig{
			AllowedOrigins: envSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173"}),
			AllowedMethods: envSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
			AllowedHeaders: envSlice("CORS_ALLOWED_HEADERS", []string{"Origin", "Content-Type", "Authorization", "X-Request-ID"}),
			MaxAge:         envInt("CORS_MAX_AGE", 86400),
		},
		Log: LogConfig{
			Level:  envStr("LOG_LEVEL", "info"),
			Format: envStr("LOG_FORMAT", "json"),
		},
		PrivadoID: PrivadoIDConfig{
			RPCURL:            envStr("PRIVADO_RPC_URL", "https://rpc-amoy.polygon.technology"),
			StateContract:     envStr("PRIVADO_STATE_CONTRACT", "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124"),
			ResolverPrefix:    envStr("PRIVADO_RESOLVER_PREFIX", "polygon:amoy"),
			IPFSGateway:       envStr("PRIVADO_IPFS_GATEWAY", "https://ipfs.io/ipfs/"),
			CircuitsDir:       envStr("PRIVADO_CIRCUITS_DIR", "./circuits"),
			CallbackURL:       envStr("PRIVADO_CALLBACK_URL", ""),
			RequestExpiration: int64(envInt("PRIVADO_REQUEST_EXPIRATION", 3600)),
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// validate checks that all required configuration values are present and valid.
func (c *Config) validate() error {
	var errs []string

	if c.Database.Host == "" {
		errs = append(errs, "DB_HOST is required")
	}
	if c.Database.User == "" {
		errs = append(errs, "DB_USER is required")
	}
	if c.Database.Password == "" {
		errs = append(errs, "DB_PASSWORD is required")
	}
	if c.Database.Name == "" {
		errs = append(errs, "DB_NAME is required")
	}

	if c.JWT.SecretKey == "" {
		errs = append(errs, "JWT_SECRET is required")
	} else if len(c.JWT.SecretKey) < 32 {
		errs = append(errs, "JWT_SECRET must be at least 32 characters")
	}

	validEnvs := map[string]bool{"development": true, "staging": true, "production": true}
	if !validEnvs[c.Server.Environment] {
		errs = append(errs, fmt.Sprintf("ENVIRONMENT must be development, staging, or production (got: %s)", c.Server.Environment))
	}

	validLogLevels := map[string]bool{"debug": true, "info": true, "warn": true, "error": true}
	if !validLogLevels[c.Log.Level] {
		errs = append(errs, fmt.Sprintf("LOG_LEVEL must be debug, info, warn, or error (got: %s)", c.Log.Level))
	}

	if len(errs) > 0 {
		return fmt.Errorf("%s", strings.Join(errs, "; "))
	}
	return nil
}

// --- Helper functions for reading environment variables ---

func envStr(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	if val := os.Getenv(key); val != "" {
		if d, err := time.ParseDuration(val); err == nil {
			return d
		}
	}
	return fallback
}

func envSlice(key string, fallback []string) []string {
	if val := os.Getenv(key); val != "" {
		parts := strings.Split(val, ",")
		result := make([]string, 0, len(parts))
		for _, p := range parts {
			if trimmed := strings.TrimSpace(p); trimmed != "" {
				result = append(result, trimmed)
			}
		}
		return result
	}
	return fallback
}
