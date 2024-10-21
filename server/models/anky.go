package models

import (
	"time"
)

type WritingSession struct {
	ID                 string    `json:"id" bson:"_id,omitempty"`
	UserID             string    `json:"user_id" bson:"user_id"`
	Content            string    `json:"content" bson:"content"`
	Duration           int       `json:"duration" bson:"duration"` // Duration in seconds
	Timestamp          time.Time `json:"timestamp" bson:"timestamp"`
	IsAnky             bool      `json:"is_anky" bson:"is_anky"`
	NewenEarned        float64   `json:"newen_earned" bson:"newen_earned"`
	DailySessionNumber int       `json:"daily_session_number" bson:"daily_session_number"`

	// Threading component
	ParentAnkyID string `json:"parent_anky_id" bson:"parent_anky_id"`
	AnkyResponse string `json:"anky_response" bson:"anky_response"`

	// AI-generated content
	ImagePrompt         string `json:"image_prompt" bson:"image_prompt"`
	SelfInquiryQuestion string `json:"self_inquiry_question" bson:"self_inquiry_question"`

	// NFT-related fields
	TokenID         string `json:"token_id" bson:"token_id"`
	ContractAddress string `json:"contract_address" bson:"contract_address"`
	ImageIPFSHash   string `json:"image_ipfs_hash" bson:"image_ipfs_hash"`
	ImageURL        string `json:"image_url" bson:"image_url"`

	// Farcaster-related field
	CastHash string `json:"cast_hash" bson:"cast_hash"`

	// Status handling
	Status string `json:"status" bson:"status"`

	// Metadata
	AIProcessedAt   *time.Time `json:"ai_processed_at" bson:"ai_processed_at"`
	NFTMintedAt     *time.Time `json:"nft_minted_at" bson:"nft_minted_at"`
	BlockchainSyncedAt *time.Time `json:"blockchain_synced_at" bson:"blockchain_synced_at"`
	LastUpdatedAt   time.Time  `json:"last_updated_at" bson:"last_updated_at"`
}

func (ws *WritingSession) IsValid() bool {
	return ws.Duration >= 480 // 8 minutes in seconds
}

func (ws *WritingSession) SetAnkyStatus() {
	ws.IsAnky = ws.IsValid()
	if ws.IsAnky {
		ws.Status = "pending_processing"
	} else {
		ws.Status = "completed"
	}
}

func (ws *WritingSession) ProcessAIContent(imagePrompt, selfInquiryQuestion string) {
	ws.ImagePrompt = imagePrompt
	ws.SelfInquiryQuestion = selfInquiryQuestion
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

func (ws *WritingSession) SetCastHash(castHash string) {
	ws.CastHash = castHash
	ws.LastUpdatedAt = time.Now()
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