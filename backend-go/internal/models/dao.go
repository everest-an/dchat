package models

import "time"

// Proposal represents a DAO governance proposal.
type Proposal struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	CreatorID   uint      `gorm:"not null;index" json:"creator_id"`
	Title       string    `gorm:"size:300;not null" json:"title"`
	Description string    `gorm:"type:text;not null" json:"description"`
	Category    string    `gorm:"size:50;default:general" json:"category"` // general, funding, membership, technical
	Status      string    `gorm:"size:20;default:active" json:"status"`    // active, passed, rejected, executed, cancelled
	VotesFor    int       `gorm:"default:0" json:"votes_for"`
	VotesAgainst int      `gorm:"default:0" json:"votes_against"`
	Quorum      int       `gorm:"default:10" json:"quorum"` // minimum votes needed
	EndsAt      time.Time `json:"ends_at"`
	ExecutedAt  *time.Time `json:"executed_at,omitempty"`
	TxHash      string    `gorm:"size:100" json:"tx_hash,omitempty"` // on-chain reference
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	Creator User   `gorm:"foreignKey:CreatorID" json:"creator,omitempty"`
	Votes   []Vote `gorm:"foreignKey:ProposalID" json:"votes,omitempty"`
}

func (Proposal) TableName() string {
	return "proposal"
}

// Vote represents a user's vote on a proposal.
type Vote struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ProposalID uint      `gorm:"not null;index:idx_vote_unique,unique" json:"proposal_id"`
	VoterID    uint      `gorm:"not null;index:idx_vote_unique,unique" json:"voter_id"`
	Choice     string    `gorm:"size:10;not null" json:"choice"` // for, against
	Weight     int       `gorm:"default:1" json:"weight"`        // token-weighted voting
	CreatedAt  time.Time `json:"created_at"`

	Voter User `gorm:"foreignKey:VoterID" json:"voter,omitempty"`
}

func (Vote) TableName() string {
	return "vote"
}

// TreasuryTransaction records DAO fund movements.
type TreasuryTransaction struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	ProposalID  *uint     `gorm:"index" json:"proposal_id,omitempty"`
	Type        string    `gorm:"size:20;not null" json:"type"` // deposit, withdrawal, allocation
	Amount      string    `gorm:"size:100;not null" json:"amount"`
	Currency    string    `gorm:"size:20;not null;default:ETH" json:"currency"`
	Recipient   string    `gorm:"size:100" json:"recipient"`
	TxHash      string    `gorm:"size:100" json:"tx_hash"`
	Description string    `gorm:"size:500" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

func (TreasuryTransaction) TableName() string {
	return "treasury_transaction"
}
