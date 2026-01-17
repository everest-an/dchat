package utils

import (
	"context"
	"fmt"
	"time"

	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
	ctx    context.Context
}

func NewRedisClient(cfg *config.RedisConfig) (*RedisClient, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.Host, cfg.Port),
		Password: cfg.Password,
		DB:       cfg.DB,
		PoolSize: 100, // Connection pool for high concurrency
	})

	ctx := context.Background()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &RedisClient{
		Client: client,
		ctx:    ctx,
	}, nil
}

func (r *RedisClient) Set(key string, value interface{}, expiration time.Duration) error {
	return r.Client.Set(r.ctx, key, value, expiration).Err()
}

func (r *RedisClient) Get(key string) (string, error) {
	return r.Client.Get(r.ctx, key).Result()
}

func (r *RedisClient) Delete(key string) error {
	return r.Client.Del(r.ctx, key).Err()
}

func (r *RedisClient) Exists(key string) (bool, error) {
	result, err := r.Client.Exists(r.ctx, key).Result()
	return result > 0, err
}

func (r *RedisClient) Publish(channel string, message interface{}) error {
	return r.Client.Publish(r.ctx, channel, message).Err()
}

func (r *RedisClient) Subscribe(channels ...string) *redis.PubSub {
	return r.Client.Subscribe(r.ctx, channels...)
}

func (r *RedisClient) Close() error {
	return r.Client.Close()
}
