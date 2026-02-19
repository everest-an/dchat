package models

import "time"

// DeviceToken stores push notification device tokens per user.
type DeviceToken struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"user_id"`
	Token      string    `gorm:"size:500;not null;uniqueIndex" json:"token"`
	Platform   string    `gorm:"size:20;not null;default:web" json:"platform"` // web, ios, android
	DeviceName string    `gorm:"size:100" json:"device_name"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (DeviceToken) TableName() string {
	return "device_token"
}

// NotificationPreference stores per-user notification settings.
type NotificationPreference struct {
	ID             uint `gorm:"primaryKey" json:"id"`
	UserID         uint `gorm:"not null;uniqueIndex" json:"user_id"`
	Messages       bool `gorm:"default:true" json:"messages"`
	GroupMessages  bool `gorm:"default:true" json:"group_messages"`
	Mentions       bool `gorm:"default:true" json:"mentions"`
	Payments       bool `gorm:"default:true" json:"payments"`
	SystemUpdates  bool `gorm:"default:true" json:"system_updates"`
	Sound          bool `gorm:"default:true" json:"sound"`
	Vibrate        bool `gorm:"default:true" json:"vibrate"`
	QuietHoursFrom string `gorm:"size:5" json:"quiet_hours_from"` // "22:00"
	QuietHoursTo   string `gorm:"size:5" json:"quiet_hours_to"`   // "08:00"
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

func (NotificationPreference) TableName() string {
	return "notification_preference"
}
