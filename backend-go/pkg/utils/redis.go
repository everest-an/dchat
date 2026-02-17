package utils

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// RedisClient wraps a go-redis client with convenience methods.
type RedisClient struct {
	Client *redis.Client
	ctx    context.Context
	log    *slog.Logger
}

// NewRedisClient creates a Redis connection using the supplied configuration.
func NewRedisClient(cfg *config.RedisConfig, log *slog.Logger) (*RedisClient, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr(),
		Password: cfg.Password,
		DB:       cfg.DB,
		PoolSize: cfg.PoolSize,
	})

	ctx := context.Background()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	log.Info("redis connected", "addr", cfg.RedisAddr(), "db", cfg.DB, "pool_size", cfg.PoolSize)

	return &RedisClient{
		Client: client,
		ctx:    ctx,
		log:    log,
	}, nil
}

// Set stores a key-value pair with an expiration.
func (r *RedisClient) Set(key string, value interface{}, expiration time.Duration) error {
	return r.Client.Set(r.ctx, key, value, expiration).Err()
}

// Get retrieves a value by key.
func (r *RedisClient) Get(key string) (string, error) {
	return r.Client.Get(r.ctx, key).Result()
}

// Delete removes a key.
func (r *RedisClient) Delete(key string) error {
	return r.Client.Del(r.ctx, key).Err()
}

// Exists checks whether a key exists.
func (r *RedisClient) Exists(key string) (bool, error) {
	result, err := r.Client.Exists(r.ctx, key).Result()
	return result > 0, err
}

// SetNX sets a key only if it does not already exist (atomic).
func (r *RedisClient) SetNX(key string, value interface{}, expiration time.Duration) (bool, error) {
	return r.Client.SetNX(r.ctx, key, value, expiration).Result()
}

// Publish sends a message to a Redis channel.
func (r *RedisClient) Publish(channel string, message interface{}) error {
	return r.Client.Publish(r.ctx, channel, message).Err()
}

// Subscribe returns a PubSub subscription on the given channels.
func (r *RedisClient) Subscribe(channels ...string) *redis.PubSub {
	return r.Client.Subscribe(r.ctx, channels...)
}

// Close releases the Redis connection.
func (r *RedisClient) Close() error {
	return r.Client.Close()
}
