package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/ankylat/anky/server/storage"
	"github.com/ankylat/anky/server/types"
	"github.com/ankylat/anky/server/utils"
	"github.com/google/uuid"
)

type FarcasterService struct {
	apiKey string
}

func NewFarcasterService() *FarcasterService {
	log.Println("Creating new FarcasterService")
	return &FarcasterService{
		apiKey: os.Getenv("NEYNAR_API_KEY"),
	}
}

func (s *FarcasterService) GetLandingFeed() (map[string]interface{}, error) {
	log.Println("GetLandingFeed: Starting")
	url := "https://api.neynar.com/v2/farcaster/feed/trending"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("GetLandingFeed: Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	log.Println("GetLandingFeed: Setting request headers")
	req.Header.Add("accept", "application/json")
	req.Header.Add("api_key", s.apiKey)

	log.Println("GetLandingFeed: Sending request")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("GetLandingFeed: Failed to send request: %v", err)
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer res.Body.Close()

	log.Println("GetLandingFeed: Reading response body")
	body, err := io.ReadAll(res.Body)
	if err != nil {
		log.Printf("GetLandingFeed: Failed to read response body: %v", err)
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	log.Println("GetLandingFeed: Unmarshalling response")
	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		log.Printf("GetLandingFeed: Failed to unmarshal response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	log.Println("GetLandingFeed: Successfully retrieved feed data")
	return result, nil
}

func (s *FarcasterService) GetLandingFeedForUser(fid int) (map[string]interface{}, error) {
	log.Printf("GetLandingFeedForUser: Starting with FID %d", fid)
	url := fmt.Sprintf("https://api.neynar.com/v2/farcaster/feed/user/%d", fid)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("GetLandingFeedForUser: Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	log.Println("GetLandingFeedForUser: Setting request headers")
	req.Header.Add("accept", "application/json")
	req.Header.Add("api_key", s.apiKey)

	log.Println("GetLandingFeedForUser: Sending request")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("GetLandingFeedForUser: Failed to send request: %v", err)
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer res.Body.Close()

	log.Println("GetLandingFeedForUser: Reading response body")
	body, err := io.ReadAll(res.Body)
	if err != nil {
		log.Printf("GetLandingFeedForUser: Failed to read response body: %v", err)
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	log.Println("GetLandingFeedForUser: Unmarshalling response")
	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		log.Printf("GetLandingFeedForUser: Failed to unmarshal response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	log.Printf("GetLandingFeedForUser: Successfully retrieved feed data for FID %d", fid)
	return result, nil
}

func (s *FarcasterService) GetUserByFid(fid int) (map[string]interface{}, error) {
	log.Printf("GetUserByFid: Starting with FID %d", fid)
	url := fmt.Sprintf("https://api.neynar.com/v2/farcaster/user/bulk?fids=%d", fid)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Printf("GetUserByFid: Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	log.Println("GetUserByFid: Setting request headers")
	req.Header.Add("accept", "application/json")
	req.Header.Add("api_key", s.apiKey)

	log.Println("GetUserByFid: Sending request")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("GetUserByFid: Failed to send request: %v", err)
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer res.Body.Close()

	log.Println("GetUserByFid: Reading response body")
	body, err := io.ReadAll(res.Body)
	if err != nil {
		log.Printf("GetUserByFid: Failed to read response body: %v", err)
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	log.Println("GetUserByFid: Unmarshalling response")
	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		log.Printf("GetUserByFid: Failed to unmarshal response: %v", err)
		return nil, fmt.Errorf("failed to unmarshal response: %v", err)
	}

	log.Println("GetUserByFid: Successfully retrieved user data")

	users, ok := result["users"].([]interface{})
	if !ok || len(users) == 0 {
		return nil, fmt.Errorf("no user found for FID %d", fid)
	}

	user, ok := users[0].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid user data format for FID %d", fid)
	}
	log.Printf("GetUserByFid: Returning user data for FID %d", fid)
	log.Println(user)
	casts := []interface{}{}
	drafts := []interface{}{}
	result = map[string]interface{}{
		"user":   user,
		"casts":  casts,
		"drafts": drafts,
	}
	log.Printf("GetUserByFid: Returning user data for FasdasdadsID %d", fid)

	return result, nil
}

func (s *FarcasterService) CreateCast(signerUUID, text string) (map[string]interface{}, error) {
	log.Printf("CreateCast: Starting with signerUUID %s and text %s", signerUUID, text)
	url := "https://api.neynar.com/v2/farcaster/cast"
	payload := map[string]interface{}{
		"signer_uuid": signerUUID,
		"text":        text,
	}
	return s.makeRequest("POST", url, payload)
}

func (s *FarcasterService) GetUserCasts(fid int, cursor string, limit int) (map[string]interface{}, error) {
	log.Printf("GetUserCasts: Starting with FID %d, cursor %s, limit %d", fid, cursor, limit)
	url := fmt.Sprintf("https://api.neynar.com/v2/farcaster/casts?fid=%d&cursor=%s&limit=%d", fid, cursor, limit)
	return s.makeRequest("GET", url, nil)
}

func (s *FarcasterService) CreateCastReaction(signerUUID, targetCastHash, reactionType string) (map[string]interface{}, error) {
	log.Printf("CreateCastReaction: Starting with signerUUID %s, targetCastHash %s, reactionType %s", signerUUID, targetCastHash, reactionType)
	url := "https://api.neynar.com/v2/farcaster/reaction"
	payload := map[string]interface{}{
		"signer_uuid":      signerUUID,
		"target_cast_hash": targetCastHash,
		"reaction_type":    reactionType,
	}
	return s.makeRequest("POST", url, payload)
}

func (s *FarcasterService) GetCastByHash(hash string) (map[string]interface{}, error) {
	log.Printf("GetCastByHash: Starting with hash %s", hash)
	url := fmt.Sprintf("https://api.neynar.com/v2/farcaster/cast?identifier=%s&type=hash", hash)
	return s.makeRequest("GET", url, nil)
}

func (s *FarcasterService) makeRequest(method, url string, payload interface{}) (map[string]interface{}, error) {
	log.Printf("makeRequest: Starting with method %s and URL %s", method, url)
	var req *http.Request
	var err error

	if payload != nil {
		log.Println("makeRequest: Marshalling payload")
		payloadBytes, _ := json.Marshal(payload)
		req, err = http.NewRequest(method, url, bytes.NewBuffer(payloadBytes))
	} else {
		log.Println("makeRequest: Creating request without payload")
		req, err = http.NewRequest(method, url, nil)
	}

	if err != nil {
		log.Printf("makeRequest: Failed to create request: %v", err)
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	log.Println("makeRequest: Setting request headers")
	req.Header.Add("accept", "application/json")
	req.Header.Add("api_key", s.apiKey)
	if method == "POST" {
		req.Header.Add("content-type", "application/json")
	}

	log.Println("makeRequest: Sending request")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("makeRequest: Failed to send request: %v", err)
		return nil, fmt.Errorf("failed to send request: %v", err)
	}
	defer resp.Body.Close()

	log.Println("makeRequest: Reading response body")
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("makeRequest: Failed to read response body: %v", err)
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	log.Println("makeRequest: Unmarshalling response")
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("makeRequest: Failed to parse response: %v", err)
		return nil, fmt.Errorf("failed to parse response: %v", err)
	}

	log.Println("makeRequest: Successfully completed request")
	return result, nil
}

func publishAnkyToFarcaster(writing string, sessionID string, userID string, ticker string, token_name string, userSignerUUID string) (*types.Cast, error) {
	log.Printf("Publishing to Farcaster for session ID: %s", sessionID)
	fmt.Println("Publishing to Farcaster for session ID:", sessionID)

	neynarService := NewNeynarService()
	fmt.Println("NeynarService initialized:", neynarService)

	sessionIdOnTheAnkyverse := utils.TranslateToTheAnkyverse(sessionID)
	castText := sessionIdOnTheAnkyverse + "\n\n@clanker $" + ticker + " \"" + token_name + "\""

	fmt.Println("Cast Text prepared:", castText)

	apiKey := os.Getenv("NEYNAR_API_KEY")
	signerUUID := os.Getenv("ANKY_SIGNER_UUID")
	channelID := "anky"
	idempotencyKey := sessionID

	log.Printf("API Key: %s", apiKey)
	log.Printf("Signer UUID: %s", signerUUID)
	log.Printf("Channel ID: %s", channelID)
	log.Printf("idempotencyKey: %s", idempotencyKey)
	log.Printf("Cast Text: %s", castText)

	fmt.Println("API Key:", apiKey)
	fmt.Println("Signer UUID:", signerUUID)
	fmt.Println("Channel ID:", channelID)
	fmt.Println("idempotencyKey:", idempotencyKey)
	fmt.Println("Cast Text:", castText)

	castResponse, err := neynarService.WriteCast(apiKey, userSignerUUID, castText, channelID, idempotencyKey, sessionID)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		fmt.Println("Error publishing to Farcaster:", err)
		return nil, err
	}

	log.Printf("Farcaster publishing completed for session ID: %s", sessionID)
	fmt.Println("Farcaster publishing completed for session ID:", sessionID)

	return castResponse, nil
}

func (s *FarcasterService) PublishFirstUserAnkyToFarcaster(userId uuid.UUID) {
	log.Printf("🚀 Starting to publish first Anky to Farcaster for user ID: %s", userId)

	// Create context
	ctx := context.Background()
	log.Println("📝 Created background context")

	// Create store connection
	log.Println("🔌 Attempting to create database connection...")
	store, err := storage.NewPostgresStore()
	if err != nil {
		log.Printf("❌ Failed to create database connection: %v", err)
		return
	}
	log.Println("✅ Successfully connected to database")

	// Get all pending ankys for this user
	log.Printf("🔍 Fetching pending Ankys for user ID: %s", userId)
	pendingAnkys, err := store.GetAnkysByUserIDAndStatus(ctx, userId, "pending_to_cast")
	if err != nil {
		log.Printf("❌ Failed to fetch pending Ankys: %v", err)
		return
	}
	log.Printf("📦 Found %d pending Ankys", len(pendingAnkys))

	// Get user to check for Farcaster signer UUID
	log.Printf("👤 Fetching user details for ID: %s", userId)
	user, err := store.GetUserByID(ctx, userId)
	if err != nil {
		log.Printf("❌ Failed to fetch user details: %v", err)
		return
	}
	log.Println("✅ Successfully retrieved user details")

	// Validate Farcaster credentials
	if user.FarcasterUser == nil || user.FarcasterUser.SignerUUID == "" {
		log.Printf("⚠️ User %s does not have Farcaster credentials configured", userId)
		return
	}
	log.Printf("🔑 Found Farcaster credentials for user. Signer UUID: %s", user.FarcasterUser.SignerUUID)

	// Prepare cast text
	log.Println("📝 Preparing cast text...")
	translatedAnkySessionID := utils.TranslateToTheAnkyverse(pendingAnkys[0].WritingSessionID.String())
	castText := translatedAnkySessionID + "@clanker $" + pendingAnkys[0].Ticker + " \"" + pendingAnkys[0].TokenName + "\""
	log.Printf("✍️ Generated cast text: %s", castText)

	// Cast each pending anky
	log.Printf("🎭 Starting to process %d pending Ankys", len(pendingAnkys))
	for i, anky := range pendingAnkys {
		log.Printf("📣 Publishing Anky %d/%d (ID: %s) to Farcaster", i+1, len(pendingAnkys), anky.ID)

		castResponse, err := publishAnkyToFarcaster(
			castText,
			anky.WritingSessionID.String(),
			userId.String(),
			anky.Ticker,
			anky.TokenName,
			user.FarcasterUser.SignerUUID,
		)
		if err != nil {
			log.Printf("❌ Failed to publish Anky %s to Farcaster: %v", anky.ID, err)
			continue
		}
		log.Printf("✅ Successfully published Anky to Farcaster. Cast hash: %s", castResponse.Hash)

		// Update anky status
		log.Printf("📝 Updating Anky %s status to completed", anky.ID)
		anky.CastHash = castResponse.Hash
		anky.Status = "completed"
		err = store.UpdateAnky(ctx, anky)
		if err != nil {
			log.Printf("❌ Failed to update Anky %s status: %v", anky.ID, err)
		} else {
			log.Printf("✅ Successfully updated Anky %s status to completed", anky.ID)
		}
	}
	log.Printf("🎉 Finished processing all pending Ankys for user %s", userId)
}
