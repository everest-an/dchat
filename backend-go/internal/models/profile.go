package models

import (
	"time"

	"gorm.io/gorm"
)

// UserSkill represents a professional skill of a user.
type UserSkill struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Name      string         `gorm:"size:200;not null" json:"name"`
	Category  string         `gorm:"size:100" json:"category"`
	Level     int            `gorm:"default:1" json:"level"` // 1-5
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserSkill) TableName() string { return "user_skill" }

// UserProject represents a portfolio project of a user.
type UserProject struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"size:200;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	URL         string         `gorm:"size:500" json:"url"`
	ImageURL    string         `gorm:"size:500" json:"image_url"`
	Tags        string         `gorm:"size:500" json:"tags"` // comma-separated
	Status      string         `gorm:"size:50;default:active" json:"status"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserProject) TableName() string { return "user_project" }

// UserResource represents a resource a user can offer.
type UserResource struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"size:200;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	Category    string         `gorm:"size:100" json:"category"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserResource) TableName() string { return "user_resource" }

// UserSeeking represents what a user is looking for.
type UserSeeking struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"size:200;not null" json:"title"`
	Description string         `gorm:"type:text" json:"description"`
	Category    string         `gorm:"size:100" json:"category"`
	Priority    string         `gorm:"size:20;default:medium" json:"priority"` // low, medium, high
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (UserSeeking) TableName() string { return "user_seeking" }

// UserBusiness holds extended business profile information.
type UserBusiness struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"uniqueIndex;not null" json:"user_id"`
	Company   string    `gorm:"size:200" json:"company_name"`
	JobTitle  string    `gorm:"size:200" json:"job_title"`
	Industry  string    `gorm:"size:100" json:"industry"`
	Location  string    `gorm:"size:200" json:"location"`
	Website   string    `gorm:"size:500" json:"website"`
	Bio       string    `gorm:"type:text" json:"bio"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (UserBusiness) TableName() string { return "user_business" }
