package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
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
