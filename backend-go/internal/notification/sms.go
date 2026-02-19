package notification

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// SMSConfig holds SMS provider configuration (Twilio-compatible).
type SMSConfig struct {
	AccountSID string
	AuthToken  string
	FromNumber string
}

// SMSService sends SMS messages via Twilio API.
type SMSService struct {
	cfg    *SMSConfig
	log    *slog.Logger
	client *http.Client
}

// NewSMSService creates an SMSService.
func NewSMSService(cfg *SMSConfig, log *slog.Logger) *SMSService {
	return &SMSService{
		cfg: cfg,
		log: log,
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

// Send sends an SMS message. Returns nil if config is not set (graceful no-op).
func (s *SMSService) Send(to, message string) error {
	if s.cfg.AccountSID == "" || s.cfg.AuthToken == "" {
		s.log.Warn("sms not configured, skipping send", "to", to)
		return nil
	}

	url := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", s.cfg.AccountSID)

	payload := map[string]string{
		"To":   to,
		"From": s.cfg.FromNumber,
		"Body": message,
	}

	body, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}

	req.SetBasicAuth(s.cfg.AccountSID, s.cfg.AuthToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		s.log.Error("failed to send sms", "to", to, "error", err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		s.log.Error("sms api error", "to", to, "status", resp.StatusCode)
		return fmt.Errorf("sms api returned status %d", resp.StatusCode)
	}

	s.log.Info("sms sent", "to", to)
	return nil
}

// SendVerificationCode sends a verification code SMS.
func (s *SMSService) SendVerificationCode(to, code string) error {
	msg := fmt.Sprintf("[dChat] Your verification code is: %s. It expires in 10 minutes.", code)
	return s.Send(to, msg)
}

// SendLoginAlert sends a login alert SMS.
func (s *SMSService) SendLoginAlert(to, ip string) error {
	msg := fmt.Sprintf("[dChat] New login detected from IP: %s. If this wasn't you, secure your account immediately.", ip)
	return s.Send(to, msg)
}
