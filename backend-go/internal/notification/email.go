package notification

import (
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
)

// EmailConfig holds SMTP configuration.
type EmailConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
}

// EmailService sends emails via SMTP (compatible with SendGrid SMTP relay).
type EmailService struct {
	cfg *EmailConfig
	log *slog.Logger
}

// NewEmailService creates an EmailService.
func NewEmailService(cfg *EmailConfig, log *slog.Logger) *EmailService {
	return &EmailService{cfg: cfg, log: log}
}

// Send sends an email. Returns nil if config is not set (graceful no-op).
func (s *EmailService) Send(to, subject, htmlBody string) error {
	if s.cfg.Host == "" || s.cfg.From == "" {
		s.log.Warn("email not configured, skipping send", "to", to, "subject", subject)
		return nil
	}

	fromHeader := s.cfg.From
	if s.cfg.FromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", s.cfg.FromName, s.cfg.From)
	}

	headers := []string{
		fmt.Sprintf("From: %s", fromHeader),
		fmt.Sprintf("To: %s", to),
		fmt.Sprintf("Subject: %s", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
	}
	msg := []byte(strings.Join(headers, "\r\n") + "\r\n\r\n" + htmlBody)

	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)

	if err := smtp.SendMail(addr, auth, s.cfg.From, []string{to}, msg); err != nil {
		s.log.Error("failed to send email", "to", to, "error", err)
		return err
	}

	s.log.Info("email sent", "to", to, "subject", subject)
	return nil
}

// SendVerificationCode sends a verification code email.
func (s *EmailService) SendVerificationCode(to, code string) error {
	body := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
			<h2 style="color: #111;">dChat Verification Code</h2>
			<p>Your verification code is:</p>
			<div style="background: #f5f5f5; padding: 16px; border-radius: 8px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold;">
				%s
			</div>
			<p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
		</div>
	`, code)
	return s.Send(to, "dChat - Verification Code", body)
}

// SendTicketUpdate sends a ticket status update email.
func (s *EmailService) SendTicketUpdate(to, ticketSubject, newStatus string) error {
	body := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
			<h2 style="color: #111;">Ticket Update</h2>
			<p>Your support ticket "<strong>%s</strong>" has been updated:</p>
			<div style="background: #f5f5f5; padding: 12px; border-radius: 8px;">
				<strong>New Status:</strong> %s
			</div>
			<p style="color: #666; font-size: 14px;">Log in to dChat to view the full update.</p>
		</div>
	`, ticketSubject, newStatus)
	return s.Send(to, "dChat - Ticket Update: "+ticketSubject, body)
}

// SendPaymentConfirmation sends a payment receipt email.
func (s *EmailService) SendPaymentConfirmation(to, amount, txHash string) error {
	body := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
			<h2 style="color: #111;">Payment Confirmation</h2>
			<p>Your payment has been processed successfully.</p>
			<div style="background: #f5f5f5; padding: 12px; border-radius: 8px;">
				<p><strong>Amount:</strong> %s</p>
				<p><strong>Transaction:</strong> <code style="font-size: 12px;">%s</code></p>
			</div>
		</div>
	`, amount, txHash)
	return s.Send(to, "dChat - Payment Confirmation", body)
}
