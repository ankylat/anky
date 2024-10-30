package models

import (
	"time"

	"github.com/google/uuid"
)

type WritingSession struct {
	SessionID           string `json:"session_id" bson:"session_id"`
	SessionIndexForUser int    `json:"session_index_for_user" bson:"session_index_for_user"`

	UserID             string    `json:"user_id" bson:"user_id"`
	Content            string    `json:"content" bson:"content"`
	WordsWritten       int       `json:"words_written" bson:"words_written"`
	TimeSpent          int       `json:"time_spent" bson:"time_spent"`
	Timestamp          time.Time `json:"timestamp" bson:"timestamp"`
	IsAnky             bool      `json:"is_anky" bson:"is_anky"`
	NewenEarned        float64   `json:"newen_earned" bson:"newen_earned"`
	DailySessionNumber int       `json:"daily_session_number" bson:"daily_session_number"`
	Prompt             string    `json:"prompt" bson:"prompt"`
	FID                int       `json:"fid" bson:"fid"`

	// Threading component
	ParentAnkyID string `json:"parent_anky_id" bson:"parent_anky_id"`
	AnkyResponse string `json:"anky_response" bson:"anky_response"`

	ChosenSelfInquiryQuestion string `json:"chosen_self_inquiry_question" bson:"chosen_self_inquiry_question"`

	// NFT-related fields
	TokenID         string `json:"token_id" bson:"token_id"`
	ContractAddress string `json:"contract_address" bson:"contract_address"`
	ImageIPFSHash   string `json:"image_ipfs_hash" bson:"image_ipfs_hash"`
	ImageURL        string `json:"image_url" bson:"image_url"`

	// Status handling
	Status string `json:"status" bson:"status"`

	// Metadata
	AIProcessedAt      *time.Time `json:"ai_processed_at" bson:"ai_processed_at"`
	NFTMintedAt        *time.Time `json:"nft_minted_at" bson:"nft_minted_at"`
	BlockchainSyncedAt *time.Time `json:"blockchain_synced_at" bson:"blockchain_synced_at"`
	LastUpdatedAt      time.Time  `json:"last_updated_at" bson:"last_updated_at"`

	// Anky-related fields
	Anky *Anky `json:"anky" bson:"anky"`
}

type Anky struct {
	ID               string    `json:"id" bson:"id"`
	AnkyIndexForUser int       `json:"anky_index_for_user" bson:"anky_index_for_user"`
	WritingSessionID string    `json:"writing_session_id" bson:"writing_session_id"`
	Reflection       string    `json:"reflection" bson:"reflection"`
	ImagePrompt      string    `json:"image_prompt" bson:"image_prompt"`
	FollowUpPrompts  []string  `json:"follow_up_prompts" bson:"follow_up_prompts"`
	ImageURL         string    `json:"image_url" bson:"image_url"`
	CastHash         string    `json:"cast_hash" bson:"cast_hash"`
	CreatedAt        time.Time `json:"created_at" bson:"created_at"`
	LastUpdatedAt    time.Time `json:"last_updated_at" bson:"last_updated_at"`
	ParentSessionID  string    `json:"parent_session_id" bson:"parent_session_id"`
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

func (ws *WritingSession) ProcessAIContent(imagePrompt, selfInquiryQuestion string) {
	ws.Anky.ImagePrompt = imagePrompt
	ws.ChosenSelfInquiryQuestion = selfInquiryQuestion
	now := time.Now()
	ws.AIProcessedAt = &now
	ws.LastUpdatedAt = now
	ws.Status = "ai_processed"
}

func (ws *WritingSession) SetNFTDetails(tokenID, contractAddress, ipfsHash, imageURL string) {
	ws.TokenID = tokenID
	ws.ContractAddress = contractAddress
	ws.ImageIPFSHash = ipfsHash
	ws.ImageURL = imageURL
	now := time.Now()
	ws.NFTMintedAt = &now
	ws.LastUpdatedAt = now
	ws.Status = "nft_minted"
}

func (ws *WritingSession) SetBlockchainSynced() {
	now := time.Now()
	ws.BlockchainSyncedAt = &now
	ws.LastUpdatedAt = now
	ws.Status = "blockchain_synced"
}

func (ws *WritingSession) SetAnkyResponse(response string) {
	ws.AnkyResponse = response
	ws.LastUpdatedAt = time.Now()
}

func (ws *WritingSession) GenerateAnky(reflection string, followUpPrompts []string, imageURL string, castHash string) {
	ws.Anky = &Anky{
		ID:               uuid.New().String(),
		WritingSessionID: ws.SessionID,
		Reflection:       reflection,
		FollowUpPrompts:  followUpPrompts,
		ImageURL:         imageURL,
		CastHash:         castHash,
		CreatedAt:        time.Now(),
		LastUpdatedAt:    time.Now(),
		ParentSessionID:  ws.ParentAnkyID,
	}
	ws.LastUpdatedAt = time.Now()
	ws.Status = "anky_generated"
}
