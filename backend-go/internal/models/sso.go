package models

import "time"

// SSOProvider stores enterprise SSO provider configuration.
type SSOProvider struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	Name         string    `gorm:"size:100;not null" json:"name"`        // e.g. "Acme Corp Okta"
	Protocol     string    `gorm:"size:10;not null" json:"protocol"`     // "saml" or "oidc"
	Domain       string    `gorm:"size:200;uniqueIndex" json:"domain"`   // e.g. "acme.com"
	Issuer       string    `gorm:"size:500" json:"issuer"`               // SAML entity ID or OIDC issuer URL
	SSOURL       string    `gorm:"size:500" json:"sso_url"`             // SAML SSO URL or OIDC authorization endpoint
	Certificate  string    `gorm:"type:text" json:"-"`                  // SAML X.509 cert (PEM)
	ClientID     string    `gorm:"size:200" json:"client_id,omitempty"` // OIDC client ID
	ClientSecret string    `gorm:"size:500" json:"-"`                   // OIDC client secret
	TokenURL     string    `gorm:"size:500" json:"token_url,omitempty"`
	UserInfoURL  string    `gorm:"size:500" json:"userinfo_url,omitempty"`
	CallbackURL  string    `gorm:"size:500" json:"callback_url"`
	Enabled      bool      `gorm:"default:true" json:"enabled"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (SSOProvider) TableName() string {
	return "sso_provider"
}

// SSOSession tracks SSO login sessions.
type SSOSession struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	ProviderID uint      `gorm:"not null;index" json:"provider_id"`
	ExternalID string    `gorm:"size:200;not null" json:"external_id"` // user ID from IdP
	Email      string    `gorm:"size:200" json:"email"`
	SessionID  string    `gorm:"size:200;uniqueIndex" json:"session_id"`
	ExpiresAt  time.Time `json:"expires_at"`
	CreatedAt  time.Time `json:"created_at"`

	Provider SSOProvider `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
}

func (SSOSession) TableName() string {
	return "sso_session"
}
