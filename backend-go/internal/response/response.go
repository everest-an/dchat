package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// APIResponse is the standard envelope for all API responses.
type APIResponse struct {
	Success   bool        `json:"success"`
	Data      interface{} `json:"data,omitempty"`
	Error     *APIError   `json:"error,omitempty"`
	RequestID string      `json:"request_id"`
}

// APIError carries machine-readable code and human-readable message.
type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// PaginatedData wraps a list result with pagination metadata.
type PaginatedData struct {
	Items      interface{} `json:"items"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// --- Predefined error codes ---

const (
	ErrCodeBadRequest     = "BAD_REQUEST"
	ErrCodeUnauthorized   = "UNAUTHORIZED"
	ErrCodeForbidden      = "FORBIDDEN"
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeConflict       = "CONFLICT"
	ErrCodeInternal       = "INTERNAL_ERROR"
	ErrCodeValidation     = "VALIDATION_ERROR"
	ErrCodeRateLimit      = "RATE_LIMIT_EXCEEDED"
	ErrCodeSignature      = "INVALID_SIGNATURE"
	ErrCodeTokenExpired   = "TOKEN_EXPIRED"
	ErrCodeTokenInvalid   = "TOKEN_INVALID"
	ErrCodeNonceExpired   = "NONCE_EXPIRED"
	ErrCodeNonceInvalid   = "NONCE_INVALID"
)

// --- Success helpers ---

// OK sends a 200 response with data.
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, APIResponse{
		Success:   true,
		Data:      data,
		RequestID: requestID(c),
	})
}

// Created sends a 201 response with data.
func Created(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, APIResponse{
		Success:   true,
		Data:      data,
		RequestID: requestID(c),
	})
}

// NoContent sends a 204 response.
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// Paginated sends a 200 response with paginated data.
func Paginated(c *gin.Context, items interface{}, total int64, page, pageSize int) {
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}
	OK(c, PaginatedData{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	})
}

// --- Error helpers ---

// BadRequest sends a 400 error.
func BadRequest(c *gin.Context, message string) {
	sendError(c, http.StatusBadRequest, ErrCodeBadRequest, message)
}

// ValidationError sends a 400 error for input validation failures.
func ValidationError(c *gin.Context, message string) {
	sendError(c, http.StatusBadRequest, ErrCodeValidation, message)
}

// Unauthorized sends a 401 error.
func Unauthorized(c *gin.Context, message string) {
	sendError(c, http.StatusUnauthorized, ErrCodeUnauthorized, message)
}

// Forbidden sends a 403 error.
func Forbidden(c *gin.Context, message string) {
	sendError(c, http.StatusForbidden, ErrCodeForbidden, message)
}

// NotFound sends a 404 error.
func NotFound(c *gin.Context, message string) {
	sendError(c, http.StatusNotFound, ErrCodeNotFound, message)
}

// Conflict sends a 409 error.
func Conflict(c *gin.Context, message string) {
	sendError(c, http.StatusConflict, ErrCodeConflict, message)
}

// InternalError sends a 500 error. The detail is logged but not exposed.
func InternalError(c *gin.Context, message string) {
	sendError(c, http.StatusInternalServerError, ErrCodeInternal, message)
}

// ErrorWithCode sends an error with a custom code and HTTP status.
func ErrorWithCode(c *gin.Context, status int, code, message string) {
	sendError(c, status, code, message)
}

func sendError(c *gin.Context, status int, code, message string) {
	c.JSON(status, APIResponse{
		Success: false,
		Error: &APIError{
			Code:    code,
			Message: message,
		},
		RequestID: requestID(c),
	})
}

// --- Request ID middleware ---

const requestIDKey = "request_id"

// RequestIDMiddleware injects a unique request ID into every request.
func RequestIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if id == "" {
			id = uuid.New().String()
		}
		c.Set(requestIDKey, id)
		c.Header("X-Request-ID", id)
		c.Next()
	}
}

func requestID(c *gin.Context) string {
	if id, ok := c.Get(requestIDKey); ok {
		return id.(string)
	}
	return ""
}
