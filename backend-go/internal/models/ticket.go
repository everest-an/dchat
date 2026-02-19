package models

import "time"

// Ticket represents a customer support ticket.
type Ticket struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	UserID      uint       `gorm:"not null;index" json:"user_id"`
	Subject     string     `gorm:"size:300;not null" json:"subject"`
	Description string     `gorm:"type:text;not null" json:"description"`
	Category    string     `gorm:"size:50;not null;default:general" json:"category"` // general, bug, feature, billing, account
	Priority    string     `gorm:"size:20;not null;default:medium" json:"priority"`  // low, medium, high, urgent
	Status      string     `gorm:"size:20;not null;default:open" json:"status"`      // open, in_progress, resolved, closed
	AssignedTo  *uint      `gorm:"index" json:"assigned_to,omitempty"`
	ResolvedAt  *time.Time `json:"resolved_at,omitempty"`
	ClosedAt    *time.Time `json:"closed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	User     User            `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Assignee *User           `gorm:"foreignKey:AssignedTo" json:"assignee,omitempty"`
	Messages []TicketMessage `gorm:"foreignKey:TicketID" json:"messages,omitempty"`
}

func (Ticket) TableName() string {
	return "ticket"
}

// TicketMessage represents a message in a support ticket conversation.
type TicketMessage struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TicketID  uint      `gorm:"not null;index" json:"ticket_id"`
	SenderID  uint      `gorm:"not null" json:"sender_id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	IsStaff   bool      `gorm:"default:false" json:"is_staff"`
	CreatedAt time.Time `json:"created_at"`

	Sender User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

func (TicketMessage) TableName() string {
	return "ticket_message"
}
