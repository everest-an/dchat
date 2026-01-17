package auth

import (
	"crypto/ecdsa"
	"errors"
	"fmt"
	"strings"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
)

type Web3Service struct{}

func NewWeb3Service() *Web3Service {
	return &Web3Service{}
}

// VerifySignature verifies that the signature was created by the wallet address
func (s *Web3Service) VerifySignature(walletAddress, message, signature string) (bool, error) {
	// Normalize wallet address
	if !common.IsHexAddress(walletAddress) {
		return false, errors.New("invalid wallet address format")
	}
	address := common.HexToAddress(walletAddress)

	// Decode signature
	sig, err := hexutil.Decode(signature)
	if err != nil {
		return false, fmt.Errorf("failed to decode signature: %w", err)
	}

	// Ethereum signatures are 65 bytes: R (32) + S (32) + V (1)
	if len(sig) != 65 {
		return false, errors.New("invalid signature length")
	}

	// Adjust V value (Ethereum uses 27/28, but we need 0/1)
	if sig[64] >= 27 {
		sig[64] -= 27
	}

	// Hash the message with Ethereum prefix
	hash := s.hashMessage(message)

	// Recover public key from signature
	pubKey, err := crypto.SigToPub(hash, sig)
	if err != nil {
		return false, fmt.Errorf("failed to recover public key: %w", err)
	}

	// Get address from public key
	recoveredAddress := crypto.PubkeyToAddress(*pubKey)

	// Compare addresses (case-insensitive)
	return strings.EqualFold(address.Hex(), recoveredAddress.Hex()), nil
}

// hashMessage creates an Ethereum signed message hash
func (s *Web3Service) hashMessage(message string) []byte {
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(message))
	return crypto.Keccak256([]byte(prefix + message))
}

// GenerateNonce generates a random nonce for signature verification
func (s *Web3Service) GenerateNonce() (string, error) {
	privateKey, err := crypto.GenerateKey()
	if err != nil {
		return "", err
	}
	return hexutil.Encode(crypto.FromECDSA(privateKey))[:16], nil
}

// GetPublicKeyFromPrivateKey derives public key from private key
func (s *Web3Service) GetPublicKeyFromPrivateKey(privateKeyHex string) (string, error) {
	privateKey, err := crypto.HexToECDSA(strings.TrimPrefix(privateKeyHex, "0x"))
	if err != nil {
		return "", err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return "", errors.New("failed to cast public key to ECDSA")
	}

	return hexutil.Encode(crypto.FromECDSAPub(publicKeyECDSA)), nil
}
