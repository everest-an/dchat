package privadoid

import (
	"fmt"
	"os"
)

// Config holds the configuration for Privado ID integration
type Config struct {
	// RPC URL for Polygon network
	RPCURL string
	
	// State contract address on Polygon
	StateContract string
	
	// Resolver prefix (e.g., "polygon:amoy")
	ResolverPrefix string
	
	// IPFS Gateway URL
	IPFSGateway string
	
	// Circuits directory path
	CircuitsDir string
	
	// Callback URL for verification
	CallbackURL string
	
	// Request expiration time in seconds
	RequestExpiration int64
}

// LoadConfig loads Privado ID configuration from environment variables
func LoadConfig() *Config {
	return &Config{
		RPCURL:            getEnv("PRIVADO_RPC_URL", "https://rpc-amoy.polygon.technology"),
		StateContract:     getEnv("PRIVADO_STATE_CONTRACT", "0x1a4cC30f2aA0377b0c3bc9848766D90cb4404124"),
		ResolverPrefix:    getEnv("PRIVADO_RESOLVER_PREFIX", "polygon:amoy"),
		IPFSGateway:       getEnv("PRIVADO_IPFS_GATEWAY", "https://ipfs.io/ipfs/"),
		CircuitsDir:       getEnv("PRIVADO_CIRCUITS_DIR", "./circuits"),
		CallbackURL:       getEnv("PRIVADO_CALLBACK_URL", "https://dchat.pro/api/verifications/verify"),
		RequestExpiration: getEnvInt64("PRIVADO_REQUEST_EXPIRATION", 3600), // 1 hour default
	}
}

// getEnv gets an environment variable or returns a default value
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvInt64 gets an integer environment variable or returns a default value
func getEnvInt64(key string, defaultValue int64) int64 {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	
	// Simple conversion (in production, add error handling)
	var result int64
	_, err := fmt.Sscanf(value, "%d", &result)
	if err != nil {
		return defaultValue
	}
	return result
}
