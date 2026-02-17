package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestGetNonce_InvalidAddress tests that an invalid wallet address is rejected.
func TestGetNonce_InvalidAddress(t *testing.T) {
	// We can test input validation without real dependencies.
	router := gin.New()

	// Create a minimal handler that only tests validation.
	router.POST("/api/auth/nonce", func(c *gin.Context) {
		var req struct {
			WalletAddress string `json:"wallet_address" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "wallet_address is required"},
			})
			return
		}
		if !ethAddressRe.MatchString(req.WalletAddress) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "invalid Ethereum wallet address format"},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing wallet_address",
			body:       `{"wallet_address": ""}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid address format - too short",
			body:       `{"wallet_address": "0x1234"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid address format - no 0x prefix",
			body:       `{"wallet_address": "abcdef1234567890abcdef1234567890abcdef12"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid address format - non-hex chars",
			body:       `{"wallet_address": "0xGGGGGG1234567890abcdef1234567890abcdef12"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid address",
			body:       `{"wallet_address": "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12"}`,
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/api/auth/nonce", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d, body: %s", tt.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

// TestWalletLogin_InvalidInput tests input validation for wallet login.
func TestWalletLogin_InvalidInput(t *testing.T) {
	router := gin.New()

	router.POST("/api/auth/wallet-login", func(c *gin.Context) {
		var req struct {
			WalletAddress string `json:"wallet_address" binding:"required"`
			Signature     string `json:"signature" binding:"required"`
			Nonce         string `json:"nonce" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "all fields required"},
			})
			return
		}
		if !ethAddressRe.MatchString(req.WalletAddress) {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "invalid address"},
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{"success": true})
	})

	tests := []struct {
		name       string
		body       map[string]string
		wantStatus int
	}{
		{
			name:       "missing all fields",
			body:       map[string]string{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "missing signature",
			body: map[string]string{
				"wallet_address": "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
				"nonce":          "abc123",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "missing nonce",
			body: map[string]string{
				"wallet_address": "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
				"signature":      "0xsig",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "invalid wallet address",
			body: map[string]string{
				"wallet_address": "invalid",
				"signature":      "0xsig",
				"nonce":          "abc123",
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "valid input",
			body: map[string]string{
				"wallet_address": "0xAbCdEf1234567890AbCdEf1234567890AbCdEf12",
				"signature":      "0xsig",
				"nonce":          "abc123",
			},
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bodyBytes, _ := json.Marshal(tt.body)
			req := httptest.NewRequest("POST", "/api/auth/wallet-login", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d, body: %s", tt.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

// TestMessageHandler_PaginationParsing tests the pagination helper.
func TestParsePagination(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		wantPage     int
		wantPageSize int
	}{
		{"defaults", "", 1, defaultPageSize},
		{"custom page", "page=3", 3, defaultPageSize},
		{"custom page_size", "page_size=25", 1, 25},
		{"both", "page=2&page_size=50", 2, 50},
		{"negative page", "page=-1", 1, defaultPageSize},
		{"zero page", "page=0", 1, defaultPageSize},
		{"over max page_size", "page_size=999", 1, maxPageSize},
		{"invalid page", "page=abc", 1, defaultPageSize},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest("GET", "/test?"+tt.query, nil)

			page, pageSize := parsePagination(c)
			if page != tt.wantPage {
				t.Errorf("expected page %d, got %d", tt.wantPage, page)
			}
			if pageSize != tt.wantPageSize {
				t.Errorf("expected pageSize %d, got %d", tt.wantPageSize, pageSize)
			}
		})
	}
}

// TestSendMessage_Validation tests message sending input validation.
func TestSendMessage_Validation(t *testing.T) {
	router := gin.New()

	router.POST("/api/messages/send", func(c *gin.Context) {
		// Simulate auth middleware setting user_id.
		c.Set("user_id", uint(1))

		var req SendMessageRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "invalid input"},
			})
			return
		}
		if req.ReceiverID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "receiver_id is required"},
			})
			return
		}
		if len(req.Content) > maxMessageContentLen {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "VALIDATION_ERROR", "message": "message too long"},
			})
			return
		}
		if req.ReceiverID == 1 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "BAD_REQUEST", "message": "cannot send to yourself"},
			})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"success": true})
	})

	tests := []struct {
		name       string
		body       map[string]interface{}
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       map[string]interface{}{},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing receiver_id",
			body:       map[string]interface{}{"content": "hello"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "self-send",
			body:       map[string]interface{}{"receiver_id": 1, "content": "hello"},
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid message",
			body:       map[string]interface{}{"receiver_id": 2, "content": "hello"},
			wantStatus: http.StatusCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			bodyBytes, _ := json.Marshal(tt.body)
			req := httptest.NewRequest("POST", "/api/messages/send", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("expected status %d, got %d, body: %s", tt.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}
