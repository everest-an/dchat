package models

import "time"

// Bot represents a programmable bot.
type Bot struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	OwnerID     uint      `gorm:"not null;index" json:"owner_id"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	AvatarURL   string    `gorm:"size:500" json:"avatar_url"`
	WebhookURL  string    `gorm:"size:500" json:"webhook_url"`
	SecretKey   string    `gorm:"size:64" json:"-"`
	APIToken    string    `gorm:"size:128;uniqueIndex" json:"-"`
	Permissions string    `gorm:"type:text" json:"permissions"` // JSON array: ["send_messages","read_messages"]
	Status      string    `gorm:"size:20;default:active" json:"status"` // active, disabled
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Owner User `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
}

func (Bot) TableName() string { return "bot" }

// BotEvent represents a webhook delivery log.
type BotEvent struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	BotID          uint      `gorm:"not null;index" json:"bot_id"`
	EventType      string    `gorm:"size:50;not null" json:"event_type"` // message, mention, command
	Payload        string    `gorm:"type:text" json:"payload"`
	DeliveryStatus string    `gorm:"size:20;default:pending" json:"delivery_status"` // pending, delivered, failed
	ResponseCode   int       `json:"response_code"`
	ResponseBody   string    `gorm:"type:text" json:"response_body"`
	CreatedAt      time.Time `json:"created_at"`

	Bot Bot `gorm:"foreignKey:BotID" json:"bot,omitempty"`
}

func (BotEvent) TableName() string { return "bot_event" }
