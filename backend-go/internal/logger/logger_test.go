package logger

import (
	"testing"
)

func TestNew_JSONFormat(t *testing.T) {
	log := New("info", "json")
	if log == nil {
		t.Fatal("expected non-nil logger")
	}
	// Smoke test: should not panic.
	log.Info("test message", "key", "value")
}

func TestNew_TextFormat(t *testing.T) {
	log := New("debug", "text")
	if log == nil {
		t.Fatal("expected non-nil logger")
	}
	log.Debug("debug message", "key", "value")
}

func TestNew_DefaultLevel(t *testing.T) {
	log := New("unknown", "json")
	if log == nil {
		t.Fatal("expected non-nil logger even with unknown level")
	}
}

func TestNew_WarnLevel(t *testing.T) {
	log := New("warn", "text")
	if log == nil {
		t.Fatal("expected non-nil logger")
	}
	log.Warn("warning message")
}

func TestNew_ErrorLevel(t *testing.T) {
	log := New("error", "json")
	if log == nil {
		t.Fatal("expected non-nil logger")
	}
	log.Error("error message", "err", "test error")
}
