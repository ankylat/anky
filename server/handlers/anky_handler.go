package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/ankylat/anky/server/models"
	"github.com/ankylat/anky/server/services"
	"github.com/gin-gonic/gin"
)

func SubmitWritingSession(c *gin.Context) {
	log.Println("Starting SubmitWritingSession handler")

	var session models.WritingSession
	if err := c.ShouldBindJSON(&session); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log.Printf("Received writing session: %+v", session)

	// Get user information from the authenticated context
	privyUser, exists := c.Get("privyUser")
	if !exists {
		log.Println("User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Type assert and extract user ID
	user, ok := privyUser.(struct {
		ID             string `json:"id"`
		CreatedAt      int64  `json:"created_at"`
		LinkedAccounts []struct {
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
		} `json:"linked_accounts"`
		HasAcceptedTerms bool `json:"has_accepted_terms"`
		IsGuest          bool `json:"is_guest"`
	})
	if !ok {
		log.Println("Failed to parse user information")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user information"})
		return
	}

	log.Printf("Authenticated user ID: %s", user.ID)

	session.UserID = user.ID
	log.Printf("Processing session for user: %s", session.UserID)

	// Save the writing session to the PostgreSQL database
	log.Println("Attempting to save writing session to database")
	err := services.SaveWritingSession(&session)
	if err != nil {
		log.Printf("Failed to save writing session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save writing session"})
		return
	}

	log.Printf("Writing session saved successfully. Session ID: %s", session.SessionID)

	// Call LLM processing
	go processWithLLM(session)

	// Publish to Farcaster
	go publishToFarcaster(session)

	c.JSON(http.StatusOK, gin.H{
		"message":    "Writing session submitted and saved successfully",
		"session_id": session.SessionID,
	})
	log.Println("SubmitWritingSession handler completed successfully")
}

func processWithLLM(session models.WritingSession) {
	log.Printf("Starting LLM processing for session ID: %s", session.SessionID)

	llmService := services.NewLLMService()

	// Prepare the chat request
	chatRequest := models.ChatRequest{
		Messages: []models.Message{
			{
				Role:    "system",
				Content: "You are an AI embodiment of Ramana Maharshi, a profound spiritual teacher known for his method of self-inquiry. You are going to receive a stream of consciousness that a user wrote, and your task is to analyze the user's writing deeply, looking beyond the surface to uncover the hidden aspects of their psyche. Based on their content, generate a JSON object with the following: 1. Four penetrating self-inquiry questions, each designed to address a different archetype of the user's psyche (e.g., the Inner Child, the Shadow, the Higher Self, the Wounded Healer). These questions should be crafted to guide the user towards a deeper understanding of their true nature. 2. A fifth question that serves as a direct pointer to the user's sense of 'I', in the style of Ramana Maharshi's core teaching. 3. A description for an image that captures the essence of their writing, focusing on symbolism that represents the user's current state of consciousness and potential for self-realization. 4. A brief analysis of the unconscious themes or patterns you detect in the user's writing. Your goal is to create a profound vehicle for self-inquiry, using the user's writing as a mirror to reflect their deeper truths and guide them towards self-realization. Be bold, insightful, and transformative in your approach. Respond with a json object with the following format: {prompt1, prompt2, prompt3, prompt4, prompt5, image_description, analysis}",
			},
			{
				Role:    "user",
				Content: session.Content,
			},
		},
	}

	// Send the chat request to the LLM service
	responseChan, err := llmService.SendChatRequest(chatRequest, true)
	if err != nil {
		log.Printf("Error sending chat request: %v", err)
		return
	}

	// Collect the response
	var fullResponse string
	for partialResponse := range responseChan {
		fullResponse += partialResponse
	}

	// Parse the JSON response
	var llmOutput struct {
		Prompts          []string `json:"prompts"`
		ImageDescription string   `json:"image_description"`
		Analysis         string   `json:"analysis"`
	}
	err = json.Unmarshal([]byte(fullResponse), &llmOutput)
	if err != nil {
		log.Printf("Error parsing LLM response: %v", err)
		return
	}

	// Generate the image using the image description
	generateImage(llmOutput.ImageDescription)

	// TODO: Update the session with the generated prompts and image
	// This should be implemented once the database schema is updated

	log.Printf("LLM processing completed for session ID: %s", session.SessionID)
}

func generateImage(imagePrompt string) {
	log.Println("Starting image generation")

	prompt := map[string]interface{}{
		"6": map[string]interface{}{
			"inputs": map[string]interface{}{
				"text": imagePrompt,
				"clip": []interface{}{"30", 1},
			},
			"class_type": "CLIPTextEncode",
			"_meta": map[string]interface{}{
				"title": "CLIP Text Encode (Positive Prompt)",
			},
		},
		"8": map[string]interface{}{
			"inputs": map[string]interface{}{
				"samples": []interface{}{"31", 0},
				"vae":     []interface{}{"30", 2},
			},
			"class_type": "VAEDecode",
			"_meta": map[string]interface{}{
				"title": "VAE Decode",
			},
		},
		"9": map[string]interface{}{
			"inputs": map[string]interface{}{
				"filename_prefix": "ComfyUI",
				"images":          []interface{}{"8", 0},
			},
			"class_type": "SaveImage",
			"_meta": map[string]interface{}{
				"title": "Save Image",
			},
		},
		"27": map[string]interface{}{
			"inputs": map[string]interface{}{
				"width":      1216,
				"height":     2048,
				"batch_size": 2,
			},
			"class_type": "EmptySD3LatentImage",
			"_meta": map[string]interface{}{
				"title": "EmptySD3LatentImage",
			},
		},
		"30": map[string]interface{}{
			"inputs": map[string]interface{}{
				"ckpt_name": "flux1-dev-fp8.safetensors",
			},
			"class_type": "CheckpointLoaderSimple",
			"_meta": map[string]interface{}{
				"title": "Load Checkpoint",
			},
		},
		"31": map[string]interface{}{
			"inputs": map[string]interface{}{
				"seed":         349267392377058,
				"steps":        20,
				"cfg":          1,
				"sampler_name": "euler",
				"scheduler":    "simple",
				"denoise":      1,
				"model":        []interface{}{"30", 0},
				"positive":     []interface{}{"35", 0},
				"negative":     []interface{}{"33", 0},
				"latent_image": []interface{}{"27", 0},
			},
			"class_type": "KSampler",
			"_meta": map[string]interface{}{
				"title": "KSampler",
			},
		},
		"33": map[string]interface{}{
			"inputs": map[string]interface{}{
				"text": "",
				"clip": []interface{}{"30", 1},
			},
			"class_type": "CLIPTextEncode",
			"_meta": map[string]interface{}{
				"title": "CLIP Text Encode (Negative Prompt)",
			},
		},
		"35": map[string]interface{}{
			"inputs": map[string]interface{}{
				"guidance":     3.5,
				"conditioning": []interface{}{"6", 0},
			},
			"class_type": "FluxGuidance",
			"_meta": map[string]interface{}{
				"title": "FluxGuidance",
			},
		},
	}

	jsonData, err := json.Marshal(map[string]interface{}{"prompt": prompt})
	if err != nil {
		log.Printf("Error marshaling prompt: %v", err)
		return
	}

	resp, err := http.Post("http://127.0.0.1:8188/prompt", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("Error sending request to ComfyUI: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status code from ComfyUI: %d", resp.StatusCode)
		return
	}

	log.Println("Image generation request sent successfully")
}

func publishToFarcaster(session models.WritingSession) {
	log.Printf("Publishing to Farcaster for session ID: %s", session.SessionID)

	neynarService := services.NewNeynarService()

	// Prepare the cast text
	castText := fmt.Sprintf("New writing session completed!\nWords written: %d\nTime spent: %d seconds\nPrompt: %s",
		session.WordsWritten, session.TimeSpent, session.Prompt)

	apiKey := os.Getenv("NEYNAR_API_KEY")
	signerUUID := os.Getenv("NEYNAR_SIGNER_UUID")
	channelID := "anky"       // Replace with your actual channel ID
	idem := session.SessionID // Using SessionID as a unique identifier for this cast

	err := neynarService.WriteCast(apiKey, signerUUID, castText, channelID, idem)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		return
	}

	log.Printf("Farcaster publishing completed for session ID: %s", session.SessionID)
}
