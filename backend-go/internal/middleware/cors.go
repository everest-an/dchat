package middleware

import (
	"strconv"
	"strings"

	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/gin-gonic/gin"
)

// CORSMiddleware returns a Gin middleware that sets CORS headers
// based on the supplied configuration rather than hard-coded values.
func CORSMiddleware(cfg *config.CORSConfig) gin.HandlerFunc {
	methods := strings.Join(cfg.AllowedMethods, ", ")
	headers := strings.Join(cfg.AllowedHeaders, ", ")
	maxAge := strconv.Itoa(cfg.MaxAge)

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if isOriginAllowed(origin, cfg.AllowedOrigins) {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if len(cfg.AllowedOrigins) == 1 && cfg.AllowedOrigins[0] == "*" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", headers)
		c.Writer.Header().Set("Access-Control-Allow-Methods", methods)
		c.Writer.Header().Set("Access-Control-Max-Age", maxAge)

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func isOriginAllowed(origin string, allowed []string) bool {
	for _, a := range allowed {
		if a == "*" || strings.EqualFold(a, origin) {
			return true
		}
	}
	return false
}
