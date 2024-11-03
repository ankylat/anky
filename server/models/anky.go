package models

import (
	"crypto/ecdsa"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/google/uuid"
	"github.com/tyler-smith/go-bip39"
)

type CreateUserRequest struct {
	PrivyUser *PrivyUser `json:"privy_user"`
}

type CreateWritingSessionRequest struct {
	SessionID           string    `json:"session_id"`
	SessionIndexForUser int       `json:"session_index_for_user"`
	UserID              uuid.UUID `json:"user_id"`
	StartingTimestamp   time.Time `json:"starting_timestamp"`
	Prompt              string    `json:"prompt"`
	Status              string    `json:"status"`
}

type CreateWritingSessionEndRequest struct {
	SessionID       string    `json:"session_id"`
	UserID          uuid.UUID `json:"user_id"`
	EndingTimestamp time.Time `json:"ending_timestamp"`
	WordsWritten    int       `json:"words_written"`
	NewenEarned     float64   `json:"newen_earned"`
	TimeSpent       int       `json:"time_spent"`
	IsAnky          bool      `json:"is_anky"`
	ParentAnkyID    string    `json:"parent_anky_id"`
	AnkyResponse    string    `json:"anky_response"`
	Status          string    `json:"status"`
}

type CreateAnkyRequest struct {
	ID               uuid.UUID `json:"id"`
	WritingSessionID string    `json:"writing_session_id"`
	ChosenPrompt     string    `json:"chosen_prompt"`
	CreatedAt        time.Time `json:"created_at"`
}

type User struct {
	ID              uuid.UUID        `json:"id"`
	PrivyDID        string           `json:"privy_did"`
	FID             int              `json:"fid"`
	Settings        *UserSettings    `json:"settings"`
	SeedPhrase      string           `json:"seed_phrase"`
	WalletAddress   string           `json:"wallet_address"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	JWT             string           `json:"jwt"`
	WritingSessions []WritingSession `json:"writing_sessions"`
	Ankys           []Anky           `json:"ankys"`
	Badges          []Badge          `json:"badges"`
}

type Badge struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	UnlockedAt  time.Time `json:"unlocked_at"`
}

type UserSettings struct {
}

type PrivyUser struct {
	ID               string          `json:"id"`
	CreatedAt        int64           `json:"created_at"`
	LinkedAccounts   []LinkedAccount `json:"linked_accounts"`
	HasAcceptedTerms bool            `json:"has_accepted_terms"`
	IsGuest          bool            `json:"is_guest"`
}

type LinkedAccount struct {
	Type              string `json:"type"`
	Address           string `json:"address,omitempty"`
	ChainType         string `json:"chain_type,omitempty"`
	FID               int    `json:"fid,omitempty"`
	OwnerAddress      string `json:"owner_address,omitempty"`
	Username          string `json:"username,omitempty"`
	DisplayName       string `json:"display_name,omitempty"`
	Bio               string `json:"bio,omitempty"`
	ProfilePicture    string `json:"profile_picture,omitempty"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	VerifiedAt        int64  `json:"verified_at"`
	FirstVerifiedAt   int64  `json:"first_verified_at"`
	LatestVerifiedAt  int64  `json:"latest_verified_at"`
}

type WritingSession struct {
	ID                  string    `json:"id" bson:"id"`
	SessionIndexForUser int       `json:"session_index_for_user" bson:"session_index_for_user"`
	UserID              uuid.UUID `json:"user_id" bson:"user_id"`
	StartingTimestamp   time.Time `json:"starting_timestamp" bson:"starting_timestamp"`
	EndingTimestamp     time.Time `json:"ending_timestamp" bson:"ending_timestamp"`
	Prompt              string    `json:"prompt" bson:"prompt"`
	Writing             string    `json:"writing" bson:"writing"`
	WordsWritten        int       `json:"words_written" bson:"words_written"`
	NewenEarned         float64   `json:"newen_earned" bson:"newen_earned"`

	TimeSpent int  `json:"time_spent" bson:"time_spent"`
	IsAnky    bool `json:"is_anky" bson:"is_anky"`

	// Threading component
	ParentAnkyID string `json:"parent_anky_id" bson:"parent_anky_id"`
	AnkyResponse string `json:"anky_response" bson:"anky_response"`

	// Status handling
	Status string `json:"status" bson:"status"`

	// Anky-related fields
	AnkyID string `json:"anky_id" bson:"anky_id"`
	Anky   *Anky  `json:"anky" bson:"anky"`
}

type Anky struct {
	ID               uuid.UUID `json:"id" bson:"id"`
	UserID           uuid.UUID `json:"user_id" bson:"user_id"`
	WritingSessionID string    `json:"writing_session_id" bson:"writing_session_id"`
	ChosenPrompt     string    `json:"chosen_prompt" bson:"chosen_prompt"`
	AnkyReflection   string    `json:"anky_reflection" bson:"anky_reflection"`
	ImagePrompt      string    `json:"image_prompt" bson:"image_prompt"`
	FollowUpPrompts  []string  `json:"follow_up_prompts" bson:"follow_up_prompts"`
	ImageURL         string    `json:"image_url" bson:"image_url"`
	ImageIPFSHash    string    `json:"image_ipfs_hash" bson:"image_ipfs_hash"`
	Status           string    `json:"status" bson:"status"`

	CastHash       string    `json:"cast_hash" bson:"cast_hash"`
	CreatedAt      time.Time `json:"created_at" bson:"created_at"`
	LastUpdatedAt  time.Time `json:"last_updated_at" bson:"last_updated_at"`
	PreviousAnkyID string    `json:"previous_anky_id" bson:"previous_anky_id"`
}

func (ws *WritingSession) IsValidAnky() bool {
	return ws.TimeSpent >= 480 // 8 minutes in seconds
}

func (ws *WritingSession) SetAnkyStatus() {
	ws.IsAnky = ws.IsValidAnky()
	if ws.IsAnky {
		ws.Status = "pending_processing"
	} else {
		ws.Status = "completed"
	}
}

func NewUser(privyUser *PrivyUser) *User {
	walletService := NewWalletService()
	mnemonic, address, err := walletService.CreateNewWallet()
	if err != nil {
		return nil
	}

	return &User{
		ID:            uuid.New(),
		PrivyDID:      privyUser.ID,
		SeedPhrase:    mnemonic,
		WalletAddress: address,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

func NewWritingSession(sessionId string, userId uuid.UUID, prompt string, sessionIndex int) *WritingSession {
	return &WritingSession{
		ID:                  sessionId,
		SessionIndexForUser: sessionIndex,
		UserID:              userId,
		StartingTimestamp:   time.Now().UTC(),
		Prompt:              prompt,
		Status:              "in_progress",
	}
}

func NewAnky(writingSessionID, chosenPrompt string, userID uuid.UUID) *Anky {
	return &Anky{
		ID:               uuid.New(),
		UserID:           userID,
		Status:           "created",
		WritingSessionID: writingSessionID,
		ChosenPrompt:     chosenPrompt,
		CreatedAt:        time.Now().UTC(),
	}
}

type WalletService struct{}

func NewWalletService() *WalletService {
	return &WalletService{}
}

func (s *WalletService) CreateNewWallet() (string, string, error) {
	// Generate entropy for mnemonic
	entropy, err := bip39.NewEntropy(128) // 128 bits = 12 words
	if err != nil {
		return "", "", fmt.Errorf("failed to generate entropy: %v", err)
	}

	// Generate mnemonic
	mnemonic, err := bip39.NewMnemonic(entropy)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate mnemonic: %v", err)
	}

	// Create seed from mnemonic
	seed := bip39.NewSeed(mnemonic, "")

	// Generate private key from seed
	privateKey, err := crypto.ToECDSA(seed[:32])
	if err != nil {
		return "", "", fmt.Errorf("failed to generate private key: %v", err)
	}

	// Generate Ethereum address from private key
	address := crypto.PubkeyToAddress(privateKey.PublicKey)

	return mnemonic, address.Hex(), nil
}

func (s *WalletService) GetAddressFromPrivateKey(privateKey *ecdsa.PrivateKey) common.Address {
	return crypto.PubkeyToAddress(privateKey.PublicKey)
}

func (s *WalletService) GetPrivateKeyFromMnemonic(mnemonic string) (*ecdsa.PrivateKey, error) {
	seed := bip39.NewSeed(mnemonic, "")
	privateKey, err := crypto.ToECDSA(seed[:32])
	if err != nil {
		return nil, fmt.Errorf("failed to generate private key from mnemonic: %v", err)
	}
	return privateKey, nil
}
