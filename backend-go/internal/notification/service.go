package notification

import "log/slog"

// Service wraps email and SMS providers behind a unified interface.
type Service struct {
	Email *EmailService
	SMS   *SMSService
	log   *slog.Logger
}

// Config bundles all notification provider configs.
type Config struct {
	Email EmailConfig
	SMS   SMSConfig
}

// NewService creates the unified notification service.
func NewService(cfg *Config, log *slog.Logger) *Service {
	return &Service{
		Email: NewEmailService(&cfg.Email, log),
		SMS:   NewSMSService(&cfg.SMS, log),
		log:   log,
	}
}

// SendVerificationCode sends a verification code via both email and SMS
// (whichever is available for the user).
func (s *Service) SendVerificationCode(email, phone, code string) {
	if email != "" {
		go func() {
			if err := s.Email.SendVerificationCode(email, code); err != nil {
				s.log.Error("email verification code failed", "error", err)
			}
		}()
	}
	if phone != "" {
		go func() {
			if err := s.SMS.SendVerificationCode(phone, code); err != nil {
				s.log.Error("sms verification code failed", "error", err)
			}
		}()
	}
}
