package models

import (
	"time"

	"gorm.io/gorm"
)

// ReportReason enumerates the allowed reasons for a report.
type ReportReason string

const (
	ReportReasonSpam          ReportReason = "spam"
	ReportReasonHarassment    ReportReason = "harassment"
	ReportReasonInappropriate ReportReason = "inappropriate"
	ReportReasonFraud         ReportReason = "fraud"
	ReportReasonOther         ReportReason = "other"
)

// ReportStatus tracks the lifecycle of a report.
type ReportStatus string

const (
	ReportStatusPending   ReportStatus = "pending"
	ReportStatusReviewing ReportStatus = "reviewing"
	ReportStatusResolved  ReportStatus = "resolved"
	ReportStatusDismissed ReportStatus = "dismissed"
)

// Report represents a user-submitted content report.
type Report struct {
	ID                uint           `gorm:"primaryKey" json:"id"`
	ReporterID        uint           `gorm:"not null;index" json:"reporter_id"`
	ReportedUserID    uint           `gorm:"not null;index" json:"reported_user_id"`
	ReportedMessageID *uint          `gorm:"index" json:"reported_message_id,omitempty"`
	Reason            ReportReason   `gorm:"size:30;not null" json:"reason"`
	Description       string         `gorm:"type:text" json:"description"`
	Status            ReportStatus   `gorm:"size:20;not null;default:pending;index" json:"status"`
	ReviewerID        *uint          `json:"reviewer_id,omitempty"`
	ResolutionNote    string         `gorm:"type:text" json:"resolution_note,omitempty"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `gorm:"index" json:"-"`

	Reporter        User     `gorm:"foreignKey:ReporterID" json:"reporter,omitempty"`
	ReportedUser    User     `gorm:"foreignKey:ReportedUserID" json:"reported_user,omitempty"`
	ReportedMessage *Message `gorm:"foreignKey:ReportedMessageID" json:"reported_message,omitempty"`
	Reviewer        *User    `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
}

func (Report) TableName() string {
	return "report"
}

// ValidReportReasons returns all valid reason values.
func ValidReportReasons() []ReportReason {
	return []ReportReason{
		ReportReasonSpam,
		ReportReasonHarassment,
		ReportReasonInappropriate,
		ReportReasonFraud,
		ReportReasonOther,
	}
}

// IsValidReason checks whether a reason string is one of the allowed values.
func IsValidReason(r string) bool {
	for _, v := range ValidReportReasons() {
		if string(v) == r {
			return true
		}
	}
	return false
}
