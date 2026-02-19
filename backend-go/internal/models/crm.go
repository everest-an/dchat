package models

import "time"

// CRMContact represents a CRM contact entry.
type CRMContact struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	OwnerID     uint      `gorm:"not null;index" json:"owner_id"`
	Name        string    `gorm:"size:200;not null" json:"name"`
	Email       string    `gorm:"size:200" json:"email"`
	Phone       string    `gorm:"size:50" json:"phone"`
	Company     string    `gorm:"size:200" json:"company"`
	Position    string    `gorm:"size:200" json:"position"`
	WalletAddr  string    `gorm:"size:100" json:"wallet_address"`
	Tags        string    `gorm:"size:500" json:"tags"` // comma-separated
	Notes       string    `gorm:"type:text" json:"notes"`
	Source      string    `gorm:"size:50" json:"source"` // chat, manual, import
	ChatUserID  *uint     `gorm:"index" json:"chat_user_id,omitempty"` // linked dchat user
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (CRMContact) TableName() string {
	return "crm_contact"
}

// CRMDeal represents a sales opportunity / deal.
type CRMDeal struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	OwnerID     uint       `gorm:"not null;index" json:"owner_id"`
	ContactID   *uint      `gorm:"index" json:"contact_id,omitempty"`
	Title       string     `gorm:"size:300;not null" json:"title"`
	Value       string     `gorm:"size:100" json:"value"` // deal value (string for crypto amounts)
	Currency    string     `gorm:"size:20;default:USD" json:"currency"`
	Stage       string     `gorm:"size:30;default:lead" json:"stage"` // lead, qualified, proposal, negotiation, won, lost
	Probability int        `gorm:"default:0" json:"probability"`      // 0-100
	Notes       string     `gorm:"type:text" json:"notes"`
	CloseDate   *time.Time `json:"close_date,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	Contact *CRMContact `gorm:"foreignKey:ContactID" json:"contact,omitempty"`
}

func (CRMDeal) TableName() string {
	return "crm_deal"
}

// CRMActivity records interactions with contacts.
type CRMActivity struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	OwnerID   uint      `gorm:"not null;index" json:"owner_id"`
	ContactID uint      `gorm:"not null;index" json:"contact_id"`
	DealID    *uint     `gorm:"index" json:"deal_id,omitempty"`
	Type      string    `gorm:"size:30;not null" json:"type"` // call, email, meeting, chat, note
	Subject   string    `gorm:"size:300" json:"subject"`
	Content   string    `gorm:"type:text" json:"content"`
	CreatedAt time.Time `json:"created_at"`
}

func (CRMActivity) TableName() string {
	return "crm_activity"
}
