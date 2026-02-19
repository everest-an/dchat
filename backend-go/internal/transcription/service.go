package transcription

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"time"

	"github.com/everest-an/dchat-backend/internal/config"
)

// Service handles audio-to-text transcription using OpenAI Whisper API.
type Service struct {
	apiKey  string
	baseURL string
	model   string
	http    *http.Client
}

// NewService creates a transcription Service from AI config.
func NewService(cfg *config.AIConfig) *Service {
	baseURL := cfg.BaseURL
	if baseURL == "" {
		baseURL = "https://api.openai.com/v1"
	}
	return &Service{
		apiKey:  cfg.APIKey,
		baseURL: baseURL,
		model:   "whisper-1",
		http: &http.Client{
			Timeout: 120 * time.Second,
		},
	}
}

// IsConfigured returns true if an API key has been provided.
func (s *Service) IsConfigured() bool {
	return s.apiKey != ""
}

// TranscriptionResponse from OpenAI.
type TranscriptionResponse struct {
	Text string `json:"text"`
}

// TranscribeAudio sends an audio file to the Whisper API and returns the transcript.
func (s *Service) TranscribeAudio(audioData io.Reader, filename string, language string) (string, error) {
	if !s.IsConfigured() {
		return "", fmt.Errorf("transcription service not configured (missing API key)")
	}

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// Add audio file.
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", fmt.Errorf("failed to create form file: %w", err)
	}
	if _, err := io.Copy(part, audioData); err != nil {
		return "", fmt.Errorf("failed to copy audio data: %w", err)
	}

	// Add model.
	writer.WriteField("model", s.model)

	// Add language hint if provided.
	if language != "" {
		writer.WriteField("language", language)
	}

	// Add response format.
	writer.WriteField("response_format", "json")

	writer.Close()

	url := s.baseURL + "/audio/transcriptions"
	req, err := http.NewRequest("POST", url, &body)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.http.Do(req)
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

	var result TranscriptionResponse
	if err := json.Unmarshal(respBytes, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	return result.Text, nil
}
