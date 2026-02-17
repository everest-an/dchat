package privadoid

import (
	"github.com/everest-an/dchat-backend/internal/config"
)

// Config holds the configuration for Privado ID integration.
// It is now populated from the unified config.PrivadoIDConfig.
type Config struct {
	RPCURL            string
	StateContract     string
	ResolverPrefix    string
	IPFSGateway       string
	CircuitsDir       string
	CallbackURL       string
	RequestExpiration int64
}

// NewConfigFromApp converts the unified PrivadoIDConfig into the
// package-local Config type.
func NewConfigFromApp(cfg *config.PrivadoIDConfig) *Config {
	return &Config{
		RPCURL:            cfg.RPCURL,
		StateContract:     cfg.StateContract,
		ResolverPrefix:    cfg.ResolverPrefix,
		IPFSGateway:       cfg.IPFSGateway,
		CircuitsDir:       cfg.CircuitsDir,
		CallbackURL:       cfg.CallbackURL,
		RequestExpiration: cfg.RequestExpiration,
	}
}
