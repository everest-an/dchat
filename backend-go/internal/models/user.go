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
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

func (User) TableName() string {
	return "user"
}

type Message struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	SenderID   uint      `gorm:"not null;index" json:"sender_id"`
	ReceiverID uint      `gorm:"not null;index" json:"receiver_id"`
	Content    string    `gorm:"type:text;not null" json:"content"`
	Encrypted  bool      `gorm:"default:false" json:"encrypted"`
	Read       bool      `gorm:"default:false" json:"read"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`

	Sender   User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver User `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
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
