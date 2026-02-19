package models

import "time"

// Task represents a to-do or task item, optionally linked to a group or message.
type Task struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	CreatorID       uint       `gorm:"not null;index" json:"creator_id"`
	AssigneeID      *uint      `gorm:"index" json:"assignee_id,omitempty"`
	GroupID         *uint      `gorm:"index" json:"group_id,omitempty"`
	Title           string     `gorm:"size:300;not null" json:"title"`
	Description     string     `gorm:"type:text" json:"description"`
	Status          string     `gorm:"size:20;not null;default:todo" json:"status"` // todo, in_progress, done
	Priority        string     `gorm:"size:20;not null;default:medium" json:"priority"` // low, medium, high, urgent
	DueDate         *time.Time `json:"due_date,omitempty"`
	SourceMessageID *uint      `gorm:"index" json:"source_message_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`

	Creator  User  `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Assignee *User `gorm:"foreignKey:AssigneeID" json:"assignee,omitempty"`
}

func (Task) TableName() string {
	return "task"
}

// CalendarEvent represents a scheduled event.
type CalendarEvent struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CreatorID   uint      `gorm:"not null;index" json:"creator_id"`
	Title       string    `gorm:"size:300;not null" json:"title"`
	Description string    `gorm:"type:text" json:"description"`
	Location    string    `gorm:"size:300" json:"location"`
	StartTime   time.Time `gorm:"not null" json:"start_time"`
	EndTime     time.Time `gorm:"not null" json:"end_time"`
	AllDay      bool      `gorm:"default:false" json:"all_day"`
	Color       string    `gorm:"size:20" json:"color"`
	GroupID     *uint     `gorm:"index" json:"group_id,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Creator      User             `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Participants []EventParticipant `gorm:"foreignKey:EventID" json:"participants,omitempty"`
}

func (CalendarEvent) TableName() string {
	return "calendar_event"
}

// EventParticipant links a user to a calendar event.
type EventParticipant struct {
	ID       uint   `gorm:"primaryKey" json:"id"`
	EventID  uint   `gorm:"not null;index:idx_event_user,unique" json:"event_id"`
	UserID   uint   `gorm:"not null;index:idx_event_user,unique" json:"user_id"`
	Status   string `gorm:"size:20;default:pending" json:"status"` // pending, accepted, declined

	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (EventParticipant) TableName() string {
	return "event_participant"
}
