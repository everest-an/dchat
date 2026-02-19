package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	WalletAddress   string         `gorm:"uniqueIndex;size:42" json:"wallet_address"`
	Email           string         `gorm:"uniqueIndex;size:120" json:"email"`
	Username        string         `gorm:"size:80" json:"username"`
	PasswordHash    string         `gorm:"size:255" json:"-"`
	Name            string         `gorm:"size:100;not null" json:"name"`
	Company         string         `gorm:"size:200" json:"company"`
	Position        string         `gorm:"size:200" json:"position"`
	LinkedInID      string         `gorm:"column:linkedin_id;size:100" json:"linkedin_id"`
	PhoneNumber     string         `gorm:"uniqueIndex;size:20" json:"phone_number"`
	IsEmailVerified bool           `json:"is_email_verified"`
	IsPhoneVerified bool           `json:"is_phone_verified"`
	PublicKey       string         `gorm:"type:text" json:"public_key"`
	Role            string         `gorm:"size:20;default:user" json:"role"`
	TotpSecret   string `gorm:"size:64" json:"-"`
	Is2FAEnabled bool   `gorm:"default:false" json:"is_2fa_enabled"`
	BackupCodes  string `gorm:"type:text" json:"-"` // comma-separated hashed codes
	IsBanned        bool           `gorm:"default:false" json:"is_banned"`
	BannedAt        *time.Time     `json:"banned_at,omitempty"`
	BanReason       string         `gorm:"size:500" json:"ban_reason,omitempty"`
	LastSeenAt      *time.Time     `json:"last_seen_at,omitempty"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string {
	return "user"
}

type Message struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	SenderID        uint       `gorm:"not null;index" json:"sender_id"`
	ReceiverID      uint       `gorm:"not null;index" json:"receiver_id"`
	Content         string     `gorm:"type:text;not null" json:"content"`
	MessageType     string     `gorm:"size:20;not null;default:text" json:"message_type"` // text, file, image, audio
	Encrypted       bool       `gorm:"default:false" json:"encrypted"`
	Read            bool       `gorm:"default:false" json:"read"`
	Recalled        bool       `gorm:"default:false" json:"recalled"`
	RecalledAt      *time.Time `json:"recalled_at,omitempty"`
	Edited          bool       `gorm:"default:false" json:"edited"`
	EditedAt        *time.Time `json:"edited_at,omitempty"`
	OriginalContent string     `gorm:"type:text" json:"-"`
	ForwardedFromID *uint      `gorm:"index" json:"forwarded_from_id,omitempty"`
	FileURL         string     `gorm:"size:500" json:"file_url,omitempty"`
	FileName        string     `gorm:"size:255" json:"file_name,omitempty"`
	FileSize        int64      `json:"file_size,omitempty"`
	Duration        float64    `json:"duration,omitempty"` // audio duration in seconds
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Sender        User     `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver      User     `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
	ForwardedFrom *Message `gorm:"foreignKey:ForwardedFromID" json:"forwarded_from,omitempty"`
}

func (Message) TableName() string {
	return "message"
}

type Project struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"not null;index" json:"user_id"`
	Title       string    `gorm:"size:200;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Status      string    `gorm:"size:50" json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Project) TableName() string {
	return "project"
}

type Moment struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	ImageURL  string    `gorm:"size:500" json:"image_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (Moment) TableName() string {
	return "moment"
}

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	AdminID   uint      `gorm:"not null;index" json:"admin_id"`
	Action    string    `gorm:"size:100;not null" json:"action"`
	Target    string    `gorm:"size:100" json:"target"`
	Detail    string    `gorm:"type:text" json:"detail"`
	IP        string    `gorm:"size:45" json:"ip"`
	CreatedAt time.Time `json:"created_at"`

	Admin User `gorm:"foreignKey:AdminID" json:"admin,omitempty"`
}

func (AuditLog) TableName() string {
	return "audit_log"
}

type SystemSetting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Key       string    `gorm:"uniqueIndex;size:100;not null" json:"key"`
	Value     string    `gorm:"type:text;not null" json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (SystemSetting) TableName() string {
	return "system_setting"
}

type PinnedConversation struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index:idx_pin_user_target,unique" json:"user_id"`
	TargetID   string    `gorm:"size:100;not null;index:idx_pin_user_target,unique" json:"target_id"` // user ID or group ID
	TargetType string    `gorm:"size:10;not null;index:idx_pin_user_target,unique" json:"target_type"` // "user" or "group"
	PinnedAt   time.Time `json:"pinned_at"`
	CreatedAt  time.Time `json:"created_at"`
}

func (PinnedConversation) TableName() string {
	return "pinned_conversation"
}
