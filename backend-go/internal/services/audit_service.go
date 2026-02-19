package services

import (
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/models"
	"gorm.io/gorm"
)

// AuditService provides async audit logging using a buffered channel.
type AuditService struct {
	db  *gorm.DB
	log *slog.Logger
	ch  chan models.AuditLog
}

// NewAuditService creates an AuditService with a buffered channel and starts the background writer.
func NewAuditService(db *gorm.DB, log *slog.Logger) *AuditService {
	s := &AuditService{
		db:  db,
		log: log,
		ch:  make(chan models.AuditLog, 256),
	}
	go s.writer()
	return s
}

// Log enqueues an audit log entry for asynchronous writing.
func (s *AuditService) Log(userID uint, action, target, detail, ip string) {
	entry := models.AuditLog{
		AdminID: userID,
		Action:  action,
		Target:  target,
		Detail:  detail,
		IP:      ip,
	}
	select {
	case s.ch <- entry:
	default:
		s.log.Warn("audit log channel full, dropping entry", "action", action)
	}
}

// writer is the background goroutine that writes audit logs to the database.
func (s *AuditService) writer() {
	for entry := range s.ch {
		if err := s.db.Create(&entry).Error; err != nil {
			s.log.Error("failed to write audit log", "error", err, "action", entry.Action)
		}
	}
}

// Close gracefully closes the channel so the writer can drain remaining entries.
func (s *AuditService) Close() {
	close(s.ch)
}
