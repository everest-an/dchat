package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/everest-an/dchat-backend/internal/config"
)

// Client is a generic LLM API client supporting OpenAI-compatible endpoints.
type Client struct {
	apiKey    string
	model     string
	maxTokens int
	baseURL   string
	http      *http.Client
}

// NewClient creates an AI Client from app config.
func NewClient(cfg *config.AIConfig) *Client {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		switch cfg.Provider {
		case "anthropic":
			baseURL = "https://api.anthropic.com/v1"
		default:
			baseURL = "https://api.openai.com/v1"
		}
	}

	return &Client{
		apiKey:    cfg.APIKey,
		model:     cfg.Model,
		maxTokens: cfg.MaxTokens,
		baseURL:   baseURL,
		http: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// IsConfigured returns true if an API key has been provided.
func (c *Client) IsConfigured() bool {
	return c.apiKey != ""
}

// ChatMessage represents a single message in a conversation.
type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ChatRequest is the request body for the OpenAI chat completions API.
type ChatRequest struct {
	Model       string        `json:"model"`
	Messages    []ChatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
}

// ChatResponse is the response from the OpenAI chat completions API.
type ChatResponse struct {
	Choices []struct {
		Message ChatMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// Complete sends a chat completion request and returns the assistant's response.
func (c *Client) Complete(system string, userMsg string, temperature float64) (string, error) {
	messages := []ChatMessage{
		{Role: "system", Content: system},
		{Role: "user", Content: userMsg},
	}
	return c.CompleteMessages(messages, temperature)
}

// CompleteMessages sends a multi-message chat completion request.
func (c *Client) CompleteMessages(messages []ChatMessage, temperature float64) (string, error) {
	if !c.IsConfigured() {
		return "", fmt.Errorf("AI service is not configured (missing API key)")
	}

	reqBody := ChatRequest{
		Model:       c.model,
		Messages:    messages,
		MaxTokens:   c.maxTokens,
		Temperature: temperature,
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	url := c.baseURL + "/chat/completions"
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(respBytes))
	}

	var chatResp ChatResponse
	if err := json.Unmarshal(respBytes, &chatResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if chatResp.Error != nil {
		return "", fmt.Errorf("API error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in response")
	}

	return chatResp.Choices[0].Message.Content, nil
}
