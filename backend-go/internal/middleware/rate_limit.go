package middleware

import (
	"sync"
	"time"

	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
)

// rateLimitEntry tracks a single user's request timestamps.
type rateLimitEntry struct {
	timestamps []time.Time
}

// RateLimiter provides a simple in-memory per-user rate limiter.
type RateLimiter struct {
	mu       sync.Mutex
	entries  map[uint]*rateLimitEntry
	limit    int
	window   time.Duration
	lastClean time.Time
}

// NewRateLimiter creates a rate limiter that allows at most limit requests
// within the given window per user.
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		entries:   make(map[uint]*rateLimitEntry),
		limit:     limit,
		window:    window,
		lastClean: time.Now(),
	}
}

// Middleware returns a Gin middleware that enforces the rate limit.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		v, exists := c.Get("user_id")
		if !exists {
			c.Next()
			return
		}
		userID := v.(uint)

		rl.mu.Lock()

		// Periodically clean up stale entries.
		if time.Since(rl.lastClean) > 5*time.Minute {
			rl.cleanup()
			rl.lastClean = time.Now()
		}

		entry, ok := rl.entries[userID]
		if !ok {
			entry = &rateLimitEntry{}
			rl.entries[userID] = entry
		}

		now := time.Now()
		cutoff := now.Add(-rl.window)

		// Remove timestamps outside the window.
		valid := entry.timestamps[:0]
		for _, t := range entry.timestamps {
			if t.After(cutoff) {
				valid = append(valid, t)
			}
		}
		entry.timestamps = valid

		if len(entry.timestamps) >= rl.limit {
			rl.mu.Unlock()
			response.ErrorWithCode(c, 429, response.ErrCodeRateLimit, "too many requests, please try again later")
			c.Abort()
			return
		}

		entry.timestamps = append(entry.timestamps, now)
		rl.mu.Unlock()

		c.Next()
	}
}

// cleanup removes entries that have no recent timestamps.
func (rl *RateLimiter) cleanup() {
	cutoff := time.Now().Add(-rl.window)
	for uid, entry := range rl.entries {
		if len(entry.timestamps) == 0 {
			delete(rl.entries, uid)
			continue
		}
		if entry.timestamps[len(entry.timestamps)-1].Before(cutoff) {
			delete(rl.entries, uid)
		}
	}
}
