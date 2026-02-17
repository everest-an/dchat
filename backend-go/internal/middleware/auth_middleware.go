package middleware

import (
	"strings"

	"github.com/everest-an/dchat-backend/internal/auth"
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates the JWT in the Authorization header and
// injects user_id and wallet_address into the Gin context.
func AuthMiddleware(jwtService *auth.JWTService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "authorization header is required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "authorization header must use Bearer scheme")
			c.Abort()
			return
		}

		claims, err := jwtService.ValidateToken(parts[1])
		if err != nil {
			response.ErrorWithCode(c, 401, response.ErrCodeTokenInvalid, "invalid or expired token")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("wallet_address", claims.WalletAddress)
		c.Next()
	}
}
