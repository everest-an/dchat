package middleware

import (
	"github.com/everest-an/dchat-backend/internal/response"
	"github.com/gin-gonic/gin"
)

// AdminMiddleware restricts access to users with admin, super_admin, or moderator roles.
func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			response.Forbidden(c, "access denied")
			c.Abort()
			return
		}

		r := role.(string)
		if r != "admin" && r != "super_admin" && r != "moderator" {
			response.Forbidden(c, "admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}

// SuperAdminMiddleware restricts access to super_admin users only.
func SuperAdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			response.Forbidden(c, "access denied")
			c.Abort()
			return
		}

		if role.(string) != "super_admin" {
			response.Forbidden(c, "super admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}
