package models

import "time"

// Mention tracks @mentions in group messages.
type Mention struct {
	ID              uint  `gorm:"primaryKey" json:"id"`
	MessageID       uint  `gorm:"not null;index" json:"message_id"`
	GroupID         uint  `gorm:"not null;index" json:"group_id"`
	MentionedUserID *uint `gorm:"index" json:"mentioned_user_id"` // nil means @all
	IsAll           bool  `gorm:"default:false" json:"is_all"`
	Read            bool  `gorm:"default:false" json:"read"`
	CreatedAt       time.Time `json:"created_at"`

	Message       GroupMessage `gorm:"foreignKey:MessageID" json:"message,omitempty"`
	Group         Group        `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	MentionedUser *User        `gorm:"foreignKey:MentionedUserID" json:"mentioned_user,omitempty"`
}

func (Mention) TableName() string {
	return "mention"
}
