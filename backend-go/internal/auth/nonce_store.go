package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/everest-an/dchat-backend/pkg/utils"
)

const noncePrefix = "nonce:"

// NonceStore manages authentication nonces in Redis for stateless operation.
type NonceStore struct {
	redis  *utils.RedisClient
	expiry time.Duration
}

// NewNonceStore creates a NonceStore backed by Redis.
func NewNonceStore(redis *utils.RedisClient, expiry time.Duration) *NonceStore {
	return &NonceStore{redis: redis, expiry: expiry}
}

// Generate creates a cryptographically random nonce, stores it in Redis
// keyed by wallet address, and returns the nonce string.
func (s *NonceStore) Generate(walletAddress string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate nonce: %w", err)
	}
	nonce := hex.EncodeToString(b)

	key := noncePrefix + walletAddress
	if err := s.redis.Set(key, nonce, s.expiry); err != nil {
		return "", fmt.Errorf("failed to store nonce: %w", err)
	}
	return nonce, nil
}

// Validate checks whether the given nonce matches the one stored for the
// wallet address. On success the nonce is deleted so it cannot be reused.
func (s *NonceStore) Validate(walletAddress, nonce string) (bool, error) {
	key := noncePrefix + walletAddress
	stored, err := s.redis.Get(key)
	if err != nil {
		return false, nil // key missing or expired
	}
	if stored != nonce {
		return false, nil
	}
	// Delete after successful validation (one-time use).
	_ = s.redis.Delete(key)
	return true, nil
}
