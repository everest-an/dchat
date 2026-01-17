package auth

import (
	"errors"
	"time"

	"github.com/everest-an/dchat-backend/internal/config"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID        uint   `json:"user_id"`
	WalletAddress string `json:"wallet_address"`
	jwt.RegisteredClaims
}

type JWTService struct {
	secretKey       []byte
	expirationHours int
}

func NewJWTService(cfg *config.JWTConfig) *JWTService {
	return &JWTService{
		secretKey:       []byte(cfg.SecretKey),
		expirationHours: cfg.ExpirationHours,
	}
}

func (s *JWTService) GenerateToken(userID uint, walletAddress string) (string, error) {
	claims := Claims{
		UserID:        userID,
		WalletAddress: walletAddress,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * time.Duration(s.expirationHours))),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secretKey)
}

func (s *JWTService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.secretKey, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
