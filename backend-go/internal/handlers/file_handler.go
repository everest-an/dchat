package handlers

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"github.com/everest-an/dchat-backend/internal/response"
)

// Allowed audio MIME types for voice messages.
var allowedAudioTypes = map[string]bool{
	"audio/webm":      true,
	"audio/ogg":       true,
	"audio/mpeg":      true,
	"audio/mp3":       true,
	"audio/wav":       true,
	"audio/x-wav":     true,
	"audio/mp4":       true,
	"audio/aac":       true,
	"audio/x-m4a":     true,
	"application/ogg": true,
}

// Allowed general file MIME type prefixes.
var allowedFilePrefixes = []string{"image/", "audio/", "video/", "application/pdf", "text/"}

// FileHandler handles file upload and download.
type FileHandler struct {
	uploadDir string
	maxSize   int64
	log       *slog.Logger
}

// NewFileHandler creates a FileHandler.
func NewFileHandler(uploadDir string, maxSize int64, log *slog.Logger) *FileHandler {
	// Ensure upload directory exists.
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Error("failed to create upload directory", "error", err, "dir", uploadDir)
	}
	return &FileHandler{uploadDir: uploadDir, maxSize: maxSize, log: log}
}

// UploadFile handles file upload.
// POST /api/files/upload
func (h *FileHandler) UploadFile(c *gin.Context) {
	_ = mustUserID(c) // ensure authenticated

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		response.ValidationError(c, "file is required")
		return
	}
	defer file.Close()

	if header.Size > h.maxSize {
		response.ValidationError(c, fmt.Sprintf("file size exceeds maximum (%d MB)", h.maxSize/(1024*1024)))
		return
	}

	contentType := header.Header.Get("Content-Type")
	if !isAllowedFileType(contentType) {
		response.ValidationError(c, "file type not allowed")
		return
	}

	// Generate unique filename preserving extension.
	ext := filepath.Ext(header.Filename)
	if ext == "" {
		ext = guessExtension(contentType)
	}
	uniqueName := uuid.New().String() + ext

	// Determine subdirectory by type.
	subDir := "files"
	if strings.HasPrefix(contentType, "audio/") || contentType == "application/ogg" {
		subDir = "audio"
	} else if strings.HasPrefix(contentType, "image/") {
		subDir = "images"
	}

	destDir := filepath.Join(h.uploadDir, subDir)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		h.log.Error("failed to create subdirectory", "error", err, "dir", destDir)
		response.InternalError(c, "failed to save file")
		return
	}

	destPath := filepath.Join(destDir, uniqueName)
	if err := c.SaveUploadedFile(header, destPath); err != nil {
		h.log.Error("failed to save file", "error", err, "path", destPath)
		response.InternalError(c, "failed to save file")
		return
	}

	// Return the relative URL path for the file.
	fileURL := fmt.Sprintf("/api/files/%s/%s", subDir, uniqueName)

	response.Created(c, gin.H{
		"file_url":  fileURL,
		"file_name": header.Filename,
		"file_size": header.Size,
		"file_type": contentType,
	})
}

// ServeFile serves an uploaded file.
// GET /api/files/:subdir/:filename
func (h *FileHandler) ServeFile(c *gin.Context) {
	subDir := c.Param("subdir")
	filename := c.Param("filename")

	// Prevent path traversal.
	if strings.Contains(subDir, "..") || strings.Contains(filename, "..") {
		response.BadRequest(c, "invalid path")
		return
	}

	filePath := filepath.Join(h.uploadDir, subDir, filename)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		response.NotFound(c, "file not found")
		return
	}

	c.File(filePath)
}

func isAllowedFileType(contentType string) bool {
	if allowedAudioTypes[contentType] {
		return true
	}
	for _, prefix := range allowedFilePrefixes {
		if strings.HasPrefix(contentType, prefix) {
			return true
		}
	}
	return false
}

func guessExtension(contentType string) string {
	switch contentType {
	case "audio/webm":
		return ".webm"
	case "audio/ogg", "application/ogg":
		return ".ogg"
	case "audio/mpeg", "audio/mp3":
		return ".mp3"
	case "audio/wav", "audio/x-wav":
		return ".wav"
	case "audio/mp4", "audio/aac", "audio/x-m4a":
		return ".m4a"
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	default:
		return ""
	}
}
