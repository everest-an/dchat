package models

import (
	"time"
)

// FriendRequestStatus tracks the state of a friend request.
type FriendRequestStatus string

const (
	FriendReqPending  FriendRequestStatus = "pending"
	FriendReqAccepted FriendRequestStatus = "accepted"
	FriendReqRejected FriendRequestStatus = "rejected"
)

// FriendRequest represents a pending or resolved friend request.
type FriendRequest struct {
	ID         uint                `gorm:"primaryKey" json:"id"`
	SenderID   uint                `gorm:"not null;index" json:"sender_id"`
	ReceiverID uint                `gorm:"not null;index" json:"receiver_id"`
	Message    string              `gorm:"size:500" json:"message"`
	Status     FriendRequestStatus `gorm:"size:20;not null;default:pending" json:"status"`
	Source     string              `gorm:"size:50;default:search" json:"source"` // search, nfc, qrcode, invite
	CreatedAt  time.Time           `json:"created_at"`
	UpdatedAt  time.Time           `json:"updated_at"`

	Sender   User `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	Receiver User `gorm:"foreignKey:ReceiverID" json:"receiver,omitempty"`
}

func (FriendRequest) TableName() string { return "friend_request" }

// Friendship represents a confirmed bidirectional friendship.
type Friendship struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;uniqueIndex:idx_friendship" json:"user_id"`
	FriendID  uint      `gorm:"not null;uniqueIndex:idx_friendship" json:"friend_id"`
	Nickname  string    `gorm:"size:100" json:"nickname"` // custom nickname for the friend
	CreatedAt time.Time `json:"created_at"`

	User   User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Friend User `gorm:"foreignKey:FriendID" json:"friend,omitempty"`
}

func (Friendship) TableName() string { return "friendship" }
