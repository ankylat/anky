package types

import (
	"crypto/ecdsa"
	"fmt"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/google/uuid"
	"github.com/tyler-smith/go-bip39"
	"golang.org/x/crypto/bcrypt"
)

type CreateUserRequest struct {
	Settings *UserSettings `json:"settings"`
	User     *User         `json:"user"`
}

type UpdateUserRequest struct {
	Settings *UserSettings `json:"settings"`
	User     *User         `json:"user"`
}

type CreatePrivyUserRequest struct {
	UserID         uuid.UUID       `json:"user_id"`
	PrivyUser      *PrivyUser      `json:"privy_user"`
	LinkedAccounts []LinkedAccount `json:"linked_accounts"`
}

type CreateWritingSessionRequest struct {
	SessionID           string    `json:"session_id"`
	SessionIndexForUser int       `json:"session_index_for_user"`
	UserID              string    `json:"user_id"`
	StartingTimestamp   time.Time `json:"starting_timestamp"`
	Prompt              string    `json:"prompt"`
	Status              string    `json:"status"`
}

type CreateWritingSessionEndRequest struct {
	SessionID       uuid.UUID `json:"session_id"`
	UserID          string    `json:"user_id"`
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
	ID               string    `json:"id"`
	WritingSessionID string    `json:"writing_session_id"`
	ChosenPrompt     string    `json:"chosen_prompt"`
	CreatedAt        time.Time `json:"created_at"`
}

type User struct {
	ID              uuid.UUID        `json:"id"`
	PrivyDID        string           `json:"privy_did"`
	PrivyUser       *PrivyUser       `json:"privy_user"`
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

type Session struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	StartTime    time.Time `json:"start_time"`
	EndTime      time.Time `json:"end_time"`
	LastActivity time.Time `json:"last_activity"`
	Status       string    `json:"status"` // active, expired, ended
	JWT          string    `json:"jwt"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Badge struct {
	ID          string    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	UnlockedAt  time.Time `json:"unlocked_at"`
}

type UserSettings struct {
	Language       string         `json:"language"`
	AnkyOnProfile  *AnkyOnProfile `json:"anky_on_profile"`
	ProfilePicture string         `json:"profile_picture"`
	DisplayName    string         `json:"display_name"`
	Bio            string         `json:"bio"`
	Username       string         `json:"username"`
}

type PrivyUser struct {
	DID              string          `json:"did"`
	UserID           uuid.UUID       `json:"user_id"`
	CreatedAt        time.Time       `json:"created_at"`
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
	ID                  uuid.UUID `json:"id" bson:"id"`
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
	WritingSessionID uuid.UUID `json:"writing_session_id" bson:"writing_session_id"`
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

type AnkyOnProfile struct {
	ID            uuid.UUID `json:"id" bson:"id"`
	UserID        uuid.UUID `json:"user_id" bson:"user_id"`
	ImagePrompt   string    `json:"image_prompt" bson:"image_prompt"`
	ImageURL      string    `json:"image_url" bson:"image_url"`
	ImageIPFSHash string    `json:"image_ipfs_hash" bson:"image_ipfs_hash"`
	CreatedAt     time.Time `json:"created_at" bson:"created_at"`
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

func NewUser() *User {
	walletService := NewWalletService()
	mnemonic, address, err := walletService.CreateNewWallet()
	if err != nil {
		return nil
	}

	encryptedSeedPhrase, err := bcrypt.GenerateFromPassword([]byte(mnemonic), bcrypt.DefaultCost)
	if err != nil {
		return nil
	}

	return &User{
		ID:            uuid.New(),
		SeedPhrase:    string(encryptedSeedPhrase),
		WalletAddress: address,
		CreatedAt:     time.Now().UTC(),
		UpdatedAt:     time.Now().UTC(),
	}
}

func NewWritingSession(sessionId uuid.UUID, userId uuid.UUID, prompt string, sessionIndex int) *WritingSession {
	return &WritingSession{
		ID:                  sessionId,
		SessionIndexForUser: sessionIndex,
		UserID:              userId,
		StartingTimestamp:   time.Now().UTC(),
		Prompt:              prompt,
		Status:              "in_progress",
	}
}

func NewAnky(writingSessionID uuid.UUID, chosenPrompt string, userID uuid.UUID) *Anky {
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

func ValidateUser(user *User) bool {
	return true
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Messages []Message `json:"messages"`
}

type LLMRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
	Stream   bool      `json:"stream"`
	Format   string    `json:"format"`
}

type StreamResponse struct {
	Message Message `json:"message"`
}

type Cast struct {
	Object               string         `json:"object"`
	Hash                 string         `json:"hash"`
	ThreadHash           string         `json:"thread_hash"`
	ParentHash           *string        `json:"parent_hash"`
	ParentURL            string         `json:"parent_url"`
	RootParentURL        string         `json:"root_parent_url"`
	ParentAuthor         Author         `json:"parent_author"`
	Author               Author         `json:"author"`
	Text                 string         `json:"text"`
	Timestamp            string         `json:"timestamp"`
	Embeds               []Embed        `json:"embeds"`
	Frames               []Frame        `json:"frames"`
	Reactions            Reactions      `json:"reactions"`
	Replies              Replies        `json:"replies"`
	Channel              Channel        `json:"channel"`
	MentionedProfiles    []Author       `json:"mentioned_profiles"`
	AuthorChannelContext ChannelContext `json:"author_channel_context"`
}

type Author struct {
	Object            string            `json:"object"`
	FID               int               `json:"fid"`
	Username          string            `json:"username"`
	DisplayName       string            `json:"display_name"`
	PfpURL            string            `json:"pfp_url"`
	CustodyAddress    string            `json:"custody_address"`
	Profile           Profile           `json:"profile"`
	FollowerCount     int               `json:"follower_count"`
	FollowingCount    int               `json:"following_count"`
	Verifications     []string          `json:"verifications"`
	VerifiedAddresses VerifiedAddresses `json:"verified_addresses"`
	VerifiedAccounts  []VerifiedAccount `json:"verified_accounts"`
	PowerBadge        bool              `json:"power_badge"`
}

type Profile struct {
	Bio Bio `json:"bio"`
}

type Bio struct {
	Text string `json:"text"`
}

type VerifiedAddresses struct {
	EthAddresses []string `json:"eth_addresses"`
	SolAddresses []string `json:"sol_addresses"`
}

type VerifiedAccount struct {
	Platform string `json:"platform"`
	Username string `json:"username"`
}

type Embed struct {
	URL      string   `json:"url"`
	Metadata Metadata `json:"metadata"`
}

type Metadata struct {
	ContentType   string  `json:"content_type"`
	ContentLength *string `json:"content_length"`
	Status        string  `json:"_status"`
}

type Frame struct {
	Version          string   `json:"version"`
	Title            string   `json:"title"`
	Image            string   `json:"image"`
	ImageAspectRatio string   `json:"image_aspect_ratio"`
	Buttons          []Button `json:"buttons"`
	Input            struct{} `json:"input"`
	State            struct{} `json:"state"`
	PostURL          string   `json:"post_url"`
	FramesURL        string   `json:"frames_url"`
}

type Button struct {
	Index      int    `json:"index"`
	Title      string `json:"title"`
	ActionType string `json:"action_type"`
	Target     string `json:"target"`
}

type Reactions struct {
	LikesCount   int                `json:"likes_count"`
	RecastsCount int                `json:"recasts_count"`
	Likes        []CastReactionUser `json:"likes"`
	Recasts      []CastReactionUser `json:"recasts"`
}

type CastReactionUser struct {
	FID   int    `json:"fid"`
	Fname string `json:"fname"`
}

type Replies struct {
	Count int `json:"count"`
}

type Channel struct {
	Object   string `json:"object"`
	ID       string `json:"id"`
	Name     string `json:"name"`
	ImageURL string `json:"image_url"`
}

type ChannelContext struct {
	Role      string `json:"role"`
	Following bool   `json:"following"`
}
