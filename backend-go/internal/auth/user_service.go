package auth

import (
	"errors"
	"fmt"
	"strings"

	"github.com/everest-an/dchat-backend/internal/models"
	"gorm.io/gorm"
)

type UserService struct {
	db *gorm.DB
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{db: db}
}

// GetOrCreateUserByWallet ensures one wallet address = one account
func (s *UserService) GetOrCreateUserByWallet(walletAddress string) (*models.User, bool, error) {
	// Normalize wallet address to lowercase
	walletAddress = strings.ToLower(walletAddress)

	var user models.User
	err := s.db.Where("wallet_address = ?", walletAddress).First(&user).Error

	if err == nil {
		// User exists
		return &user, false, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Database error
		return nil, false, fmt.Errorf("database error: %w", err)
	}

	// User doesn't exist, create new account
	user = models.User{
		WalletAddress: walletAddress,
		Name:          fmt.Sprintf("User_%s", walletAddress[:8]),
		Username:      walletAddress[:12],
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, false, fmt.Errorf("failed to create user: %w", err)
	}

	return &user, true, nil
}

// GetUserByID retrieves user by ID
func (s *UserService) GetUserByID(userID uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByWallet retrieves user by wallet address
func (s *UserService) GetUserByWallet(walletAddress string) (*models.User, error) {
	walletAddress = strings.ToLower(walletAddress)
	var user models.User
	if err := s.db.Where("wallet_address = ?", walletAddress).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// UpdateUser updates user information
func (s *UserService) UpdateUser(user *models.User) error {
	return s.db.Save(user).Error
}

// GetUserByEmail retrieves user by email
func (s *UserService) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByPhone retrieves user by phone number
func (s *UserService) GetUserByPhone(phone string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("phone_number = ?", phone).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// ListUsers retrieves paginated list of users
func (s *UserService) ListUsers(offset, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	if err := s.db.Model(&models.User{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := s.db.Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}
