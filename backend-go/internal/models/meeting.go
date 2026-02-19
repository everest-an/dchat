package models

import (
	"time"

	"gorm.io/datatypes"
)

// Meeting represents a recorded meeting/call session with transcript and summary.
type Meeting struct {
	ID           uint           `gorm:"primaryKey" json:"id"`
	CreatorID    uint           `gorm:"not null;index" json:"creator_id"`
	GroupID      *uint          `gorm:"index" json:"group_id,omitempty"`
	Title        string         `gorm:"size:200" json:"title"`
	Participants datatypes.JSON `gorm:"type:jsonb" json:"participants"` // array of user IDs
	StartedAt    time.Time      `json:"started_at"`
	EndedAt      *time.Time     `json:"ended_at,omitempty"`
	Duration     int            `json:"duration"` // in seconds
	Transcript   string         `gorm:"type:text" json:"transcript,omitempty"`
	Summary      string         `gorm:"type:text" json:"summary,omitempty"`
	ActionItems  datatypes.JSON `gorm:"type:jsonb" json:"action_items,omitempty"` // array of strings
	Status       string         `gorm:"size:20;default:active" json:"status"`     // active, ended, archived
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`

	Creator User `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
}

func (Meeting) TableName() string {
	return "meeting"
}
