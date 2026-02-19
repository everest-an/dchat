package models

import (
	"time"

	"gorm.io/gorm"
)

// GroupRole defines the role of a member within a group.
type GroupRole string

const (
	GroupRoleOwner  GroupRole = "owner"
	GroupRoleAdmin  GroupRole = "admin"
	GroupRoleMember GroupRole = "member"
)

// JoinRequestStatus tracks the state of a group join request.
type JoinRequestStatus string

const (
	JoinRequestPending  JoinRequestStatus = "pending"
	JoinRequestApproved JoinRequestStatus = "approved"
	JoinRequestRejected JoinRequestStatus = "rejected"
)

// Group represents a chat group.
type Group struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	Name            string         `gorm:"size:200;not null" json:"name"`
	Description     string         `gorm:"type:text" json:"description"`
	AvatarURL       string         `gorm:"size:500" json:"avatar_url"`
	OwnerID         uint           `gorm:"not null;index" json:"owner_id"`
	MaxMembers      int            `gorm:"default:256" json:"max_members"`
	IsPublic        bool           `gorm:"default:false" json:"is_public"`
	RequireApproval bool           `gorm:"default:false" json:"require_approval"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`

	Owner   User          `gorm:"foreignKey:OwnerID" json:"owner,omitempty"`
	Members []GroupMember `gorm:"foreignKey:GroupID" json:"members,omitempty"`
}

func (Group) TableName() string {
	return "group"
}

// GroupMember represents the membership of a user in a group.
type GroupMember struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	GroupID   uint       `gorm:"not null;index;uniqueIndex:idx_group_user" json:"group_id"`
	UserID    uint       `gorm:"not null;index;uniqueIndex:idx_group_user" json:"user_id"`
	Role      GroupRole  `gorm:"size:20;not null;default:member" json:"role"`
	Nickname  string     `gorm:"size:100" json:"nickname"`
	IsMuted   bool       `gorm:"default:false" json:"is_muted"`
	MutedUntil *time.Time `json:"muted_until,omitempty"`
	JoinedAt  time.Time  `gorm:"not null;default:now()" json:"joined_at"`

	User  User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Group Group `gorm:"foreignKey:GroupID" json:"-"`
}

func (GroupMember) TableName() string {
	return "group_member"
}

// GroupAnnouncement represents a pinned announcement in a group.
type GroupAnnouncement struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	GroupID   uint      `gorm:"not null;index" json:"group_id"`
	AuthorID  uint      `gorm:"not null" json:"author_id"`
	Content   string    `gorm:"type:text;not null" json:"content"`
	IsPinned  bool      `gorm:"default:true" json:"is_pinned"`
	CreatedAt time.Time `json:"created_at"`

	Author User `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
}

func (GroupAnnouncement) TableName() string {
	return "group_announcement"
}

// GroupMessage represents a message sent in a group chat.
type GroupMessage struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	GroupID     uint       `gorm:"not null;index" json:"group_id"`
	SenderID    uint       `gorm:"not null;index" json:"sender_id"`
	Content     string     `gorm:"type:text;not null" json:"content"`
	MessageType string     `gorm:"size:20;not null;default:text" json:"message_type"` // text, file, image, system
	Encrypted   bool       `gorm:"default:false" json:"encrypted"`
	Recalled    bool       `gorm:"default:false" json:"recalled"`
	RecalledAt  *time.Time `json:"recalled_at,omitempty"`
	Edited      bool       `gorm:"default:false" json:"edited"`
	EditedAt    *time.Time `json:"edited_at,omitempty"`
	FileURL     string     `gorm:"size:500" json:"file_url,omitempty"`
	FileName    string     `gorm:"size:255" json:"file_name,omitempty"`
	FileSize    int64      `json:"file_size,omitempty"`
	Duration    float64    `json:"duration,omitempty"` // audio duration in seconds
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	Sender User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
}

func (GroupMessage) TableName() string {
	return "group_message"
}

// GroupJoinRequest represents a request to join a group that requires approval.
type GroupJoinRequest struct {
	ID         uint              `gorm:"primaryKey" json:"id"`
	GroupID    uint              `gorm:"not null;index" json:"group_id"`
	UserID     uint              `gorm:"not null;index" json:"user_id"`
	Message    string            `gorm:"type:text" json:"message"`
	Status     JoinRequestStatus `gorm:"size:20;not null;default:pending" json:"status"`
	ReviewerID *uint             `json:"reviewer_id,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`

	User     User  `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Reviewer *User `gorm:"foreignKey:ReviewerID" json:"reviewer,omitempty"`
}

func (GroupJoinRequest) TableName() string {
	return "group_join_request"
}
