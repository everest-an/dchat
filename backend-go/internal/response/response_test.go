package response

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupTestContext() (*gin.Context, *httptest.ResponseRecorder) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	return c, w
}

func parseResponse(t *testing.T, w *httptest.ResponseRecorder) APIResponse {
	t.Helper()
	var resp APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}
	return resp
}

func TestOK_WithoutMiddleware(t *testing.T) {
	c, w := setupTestContext()
	OK(c, gin.H{"message": "hello"})

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if !resp.Success {
		t.Error("expected success=true")
	}
	if resp.Error != nil {
		t.Error("expected no error")
	}
	// Without RequestIDMiddleware, request_id is empty string.
	if resp.RequestID != "" {
		t.Error("expected empty request_id without middleware")
	}
}

func TestOK_WithRequestIDMiddleware(t *testing.T) {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	// Simulate the middleware setting request_id.
	c.Set("request_id", "test-uuid-1234")
	OK(c, gin.H{"message": "hello"})

	resp := parseResponse(t, w)
	if resp.RequestID != "test-uuid-1234" {
		t.Errorf("expected request_id 'test-uuid-1234', got '%s'", resp.RequestID)
	}
}

func TestCreated(t *testing.T) {
	c, w := setupTestContext()
	Created(c, gin.H{"id": 1})

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if !resp.Success {
		t.Error("expected success=true")
	}
}

func TestBadRequest(t *testing.T) {
	c, w := setupTestContext()
	BadRequest(c, "invalid input")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Success {
		t.Error("expected success=false")
	}
	if resp.Error == nil {
		t.Fatal("expected error object")
	}
	if resp.Error.Code != ErrCodeBadRequest {
		t.Errorf("expected code %s, got %s", ErrCodeBadRequest, resp.Error.Code)
	}
	if resp.Error.Message != "invalid input" {
		t.Errorf("expected message 'invalid input', got '%s'", resp.Error.Message)
	}
}

func TestUnauthorized(t *testing.T) {
	c, w := setupTestContext()
	Unauthorized(c, "not authenticated")

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Error.Code != ErrCodeUnauthorized {
		t.Errorf("expected code %s, got %s", ErrCodeUnauthorized, resp.Error.Code)
	}
}

func TestNotFound(t *testing.T) {
	c, w := setupTestContext()
	NotFound(c, "resource not found")

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Error.Code != ErrCodeNotFound {
		t.Errorf("expected code %s, got %s", ErrCodeNotFound, resp.Error.Code)
	}
}

func TestInternalError(t *testing.T) {
	c, w := setupTestContext()
	InternalError(c, "something broke")

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Error.Code != ErrCodeInternal {
		t.Errorf("expected code %s, got %s", ErrCodeInternal, resp.Error.Code)
	}
}

func TestValidationError(t *testing.T) {
	c, w := setupTestContext()
	ValidationError(c, "field X is required")

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Error.Code != ErrCodeValidation {
		t.Errorf("expected code %s, got %s", ErrCodeValidation, resp.Error.Code)
	}
}

func TestPaginated(t *testing.T) {
	c, w := setupTestContext()
	items := []string{"a", "b", "c"}
	Paginated(c, items, 30, 2, 10)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if !resp.Success {
		t.Error("expected success=true")
	}

	// Parse the data as PaginatedData.
	dataBytes, _ := json.Marshal(resp.Data)
	var pd PaginatedData
	if err := json.Unmarshal(dataBytes, &pd); err != nil {
		t.Fatalf("failed to parse paginated data: %v", err)
	}
	if pd.Total != 30 {
		t.Errorf("expected total 30, got %d", pd.Total)
	}
	if pd.Page != 2 {
		t.Errorf("expected page 2, got %d", pd.Page)
	}
	if pd.PageSize != 10 {
		t.Errorf("expected page_size 10, got %d", pd.PageSize)
	}
	if pd.TotalPages != 3 {
		t.Errorf("expected total_pages 3, got %d", pd.TotalPages)
	}
}

func TestErrorWithCode(t *testing.T) {
	c, w := setupTestContext()
	ErrorWithCode(c, 429, ErrCodeRateLimit, "too many requests")

	if w.Code != 429 {
		t.Errorf("expected 429, got %d", w.Code)
	}
	resp := parseResponse(t, w)
	if resp.Error.Code != ErrCodeRateLimit {
		t.Errorf("expected code %s, got %s", ErrCodeRateLimit, resp.Error.Code)
	}
}
