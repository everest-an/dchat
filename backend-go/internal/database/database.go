package database

import (
	"fmt"
	"log/slog"

	"github.com/everest-an/dchat-backend/internal/config"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// Database wraps a GORM DB connection with lifecycle helpers.
type Database struct {
	DB *gorm.DB
}

// New opens a PostgreSQL connection using the supplied configuration.
// Connection pool parameters are applied from cfg rather than hard-coded.
func New(cfg *config.DatabaseConfig, log *slog.Logger) (*Database, error) {
	dsn := cfg.DSN()

	gormCfg := &gorm.Config{
		Logger:                                   gormlogger.Default.LogMode(gormlogger.Warn),
		DisableForeignKeyConstraintWhenMigrating: true,
	}

	db, err := gorm.Open(postgres.Open(dsn), gormCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Apply pool settings from config instead of hard-coded values.
	sqlDB.SetMaxOpenConns(cfg.MaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.MaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("database ping failed: %w", err)
	}

	log.Info("database connected",
		"host", cfg.Host,
		"port", cfg.Port,
		"name", cfg.Name,
		"max_open", cfg.MaxOpenConns,
		"max_idle", cfg.MaxIdleConns,
	)

	return &Database{DB: db}, nil
}

// Close releases the underlying database connection.
func (d *Database) Close() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// Ping verifies the database connection is alive.
func (d *Database) Ping() error {
	sqlDB, err := d.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}
