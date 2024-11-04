package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ankylat/anky/server/models"
	"github.com/ankylat/anky/server/services"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/exp/rand"
)

func GetRecentAnkys(c *gin.Context) {
	log.Println("Starting GetRecentAnkys handler")
	ankys, err := services.GetRecentValidAnkys()
	if err != nil {
		log.Printf("Error getting recent ankys: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get recent ankys"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"ankys": ankys,
	})
}

func GenerateAnkyFromPrompt(c *gin.Context) {
	log.Println("Starting GenerateAnkyFromPrompt handler")

	// Parse request body
	var requestBody struct {
		Prompt string `json:"prompt"`
	}
	if err := c.ShouldBindJSON(&requestBody); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}
	log.Printf("Received prompt: %s", requestBody.Prompt)

	// Generate image using Midjourney
	log.Println("Generating image with Midjourney")
	imageID, err := generateImageWithMidjourney("https://s.mj.run/YLJMlMJbo70 " + requestBody.Prompt)
	if err != nil {
		log.Printf("Failed to generate image: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to generate image: %v", err)})
		return
	}
	log.Printf("Generated image ID: %s", imageID)

	// Poll for image completion
	log.Println("Polling for image completion")
	status, err := pollImageStatus(imageID)
	if err != nil {
		log.Printf("Error polling image status: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error polling image status: %v", err)})
		return
	}
	log.Printf("Image status: %s", status)

	if status != "completed" {
		log.Println("Image generation failed")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Image generation failed"})
		return
	}

	// Fetch final image details
	log.Println("Fetching image details")
	imageDetails, err := fetchImageDetails(imageID)
	if err != nil {
		log.Printf("Error fetching image details: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error fetching image details: %v", err)})
		return
	}
	log.Printf("Retrieved image URL: %s", imageDetails.URL)

	// Download the image from the URL
	log.Println("Downloading image")
	resp, err := http.Get(imageDetails.URL)
	if err != nil {
		log.Printf("Error downloading image: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error downloading image: %v", err)})
		return
	}
	defer resp.Body.Close()

	// Initialize image handler
	log.Println("Initializing image handler")
	imageHandler, err := NewImageHandler()
	if err != nil {
		log.Printf("Error creating ImageHandler: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creating ImageHandler: %v", err)})
		return
	}

	// Generate a unique ID for the image
	imageID = uuid.New().String()
	log.Printf("Generated new image ID: %s", imageID)

	// Upload to Cloudinary using existing function
	log.Println("Uploading to Cloudinary")
	uploadResult, err := uploadImageToCloudinary(imageHandler, imageDetails.URL, imageID)
	if err != nil {
		log.Printf("Error uploading to Cloudinary: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error uploading to Cloudinary: %v", err)})
		return
	}
	log.Printf("Successfully uploaded to Cloudinary. URL: %s", uploadResult.SecureURL)

	// Return success response with Cloudinary URL
	log.Println("Returning success response")
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"url":    uploadResult.SecureURL,
	})
}

func SubmitWritingSession(c *gin.Context) {
	log.Println("Starting SubmitWritingSession handler")

	var session models.WritingSession
	if err := c.ShouldBindJSON(&session); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	sessionJSON, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		log.Printf("Error marshalling session to JSON: %v", err)
	} else {
		log.Printf("Received writing session: %s", sessionJSON)
	}

	// Get user information from the authenticated context
	privyUser, exists := c.Get("privyUser")
	if !exists {
		log.Println("User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Type assert and extract user ID
	user, ok := privyUser.(models.PrivyUser)
	if !ok {
		log.Println("Failed to parse user information")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse user information"})
		return
	}

	log.Printf("Authenticated user ID: %s", user.ID)

	session.UserID = uuid.MustParse(user.ID)
	log.Printf("Processing session for user: %s", session.UserID)

	// Save initial writing session to the PostgreSQL database
	log.Println("Attempting to save initial writing session to database")
	err = services.SaveWritingSession(&session)
	if err != nil {
		log.Printf("Failed to save writing session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save writing session"})
		return
	}

	log.Printf("Writing session saved successfully. Session ID: %s", session.ID)

	// Call LLM processing
	anky, err := processWithLLM(session)
	if err != nil {
		log.Printf("Error processing with LLM: %v", err)
		session.Status = "llm_processing_failed"
	} else {
		session.Anky = anky
		session.Status = "llm_processed"
		log.Printf("LLM processing completed successfully")

		// Update session after LLM processing
		err = services.UpdateWritingSession(&session)
		if err != nil {
			log.Printf("Error updating session after LLM processing: %v", err)
		}
	}

	// Publish to Farcaster
	castResponse, err := publishToFarcaster(session)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		session.Status = "farcaster_publish_failed"
	} else {
		log.Printf("Successfully published to Farcaster. Cast hash: %s", castResponse.Hash)
		session.Status = "farcaster_published"
		// Add nil check before accessing session.Anky
		if session.Anky != nil {
			session.Anky.CastHash = castResponse.Hash
		} else {
			log.Printf("Warning: session.Anky is nil, cannot set CastHash")
		}

		// Update session after Farcaster publishing
		err = services.UpdateWritingSession(&session)
		if err != nil {
			log.Printf("Error updating session after Farcaster publishing: %v", err)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Writing session submitted successfully",
		"session_id": session.ID,
		"status":     session.Status,
	})
	log.Println("SubmitWritingSession handler completed")
}

func processWithLLM(session models.WritingSession) (*models.Anky, error) {
	log.Printf("Starting LLM processing for session ID: %s", session.ID)

	llmService := services.NewLLMService()

	// Prepare the chat request
	chatRequest := models.ChatRequest{
		Messages: []models.Message{
			{
				Role: "system",
				Content: `You are an AI guide for deep self-exploration, grounded in the tradition of Ramana Maharshi's self-inquiry method. Your role is to analyze the user's stream of consciousness writing and generate prompts that guide them deeper into their psyche. Focus on the five cardinal directions of inquiry, each representing a fundamental aspect of human experience.
	
				Generate a JSON object with the following structure:
				
				{
					"center": "A direct question pointing to the source of the 'I' thought, in the style of Ramana Maharshi. This prompt should guide the user to explore their core identity and sense of self.",
					"purpose": "A probing question about the user's deepest sense of purpose and meaning in life. This prompt should encourage reflection on personal calling and life's significance.",
					"mortality": "A direct question addressing awareness of mortality and life's transient nature. This prompt should confront the user with themes of impermanence, transformation, and finite existence.",
					"freedom": "A challenging question about the nature and limits of personal freedom. This prompt should explore themes of personal choice, authenticity, and self-determination.",
					"connection": "An insightful question exploring the user's web of relationships and sense of interconnection. This prompt should examine themes of interdependence and unity with others and the world.",
					"imageprompt": "A vivid, symbolic description for image generation, incorporating elements from all explored directions. This should capture the essence of the user's writing and serve as a visual representation of their self-exploration journey."
				}

				Guidelines for generating prompts:
				1. CENTER prompts should always point directly to the source of the 'I' thought
				2. PURPOSE prompts should explore meaning and purpose without spiritual bypass
				3. MORTALITY prompts should face mortality and impermanence directly
				4. FREEDOM prompts should challenge assumed limitations
				5. CONNECTION prompts should explore authentic connection
				
				Keep all responses penetrating and direct. Avoid spiritual jargon. Use clear, precise language that guides the user toward genuine self-understanding. Each direction should maintain its archetypal nature while adapting to the user's current exploration. Strictly adhere to this JSON format in your response.`,
			},
			{
				Role:    "user",
				Content: session.Writing,
			},
		},
	}

	// Send the chat request to the LLM service
	log.Printf("Sending chat request to LLM service")
	responseChan, err := llmService.SendChatRequest(chatRequest, true)
	if err != nil {
		log.Printf("Error sending chat request: %v", err)
		return nil, err
	}

	// Collect the response
	log.Printf("Collecting response from LLM service")
	var fullResponse string
	for partialResponse := range responseChan {
		fullResponse += partialResponse
		log.Printf("Received partial response: %s", partialResponse)
	}

	// Parse the JSON response
	log.Printf("Parsing JSON response from LLM")
	var llmOutput struct {
		Center      string `json:"center"`
		Purpose     string `json:"purpose"`
		Mortality   string `json:"mortality"`
		Freedom     string `json:"freedom"`
		Connection  string `json:"connection"`
		ImagePrompt string `json:"imageprompt"`
	}
	err = json.Unmarshal([]byte(fullResponse), &llmOutput)
	if err != nil {
		log.Printf("Error parsing LLM response: %v", err)
		return nil, err
	}
	log.Printf("Parsed LLM output: %+v", llmOutput)

	// Generate the image using the image description
	log.Printf("Generating image with Midjourney using description: %s", llmOutput.ImagePrompt)
	imageResponse, err := generateImageWithMidjourney("https://s.mj.run/YLJMlMJbo70 " + llmOutput.ImagePrompt)
	if err != nil {
		log.Printf("Error generating image: %v", err)
		return nil, err
	}
	log.Printf("Image generation response: %s", imageResponse)

	// Poll for image status
	status, err := pollImageStatus(imageResponse)
	if err != nil {
		log.Printf("Error polling image status: %v", err)
		return nil, err
	}
	log.Printf("Image generation status: %s", status)

	// Fetch the image details from the API
	imageDetails, err := fetchImageDetails(imageResponse)
	if err != nil {
		log.Printf("Error fetching image details: %v", err)
		return nil, err
	}

	// Choose a random image from the upscaled options
	if len(imageDetails.UpscaledURLs) == 0 {
		log.Printf("No upscaled images available")
		return nil, fmt.Errorf("no upscaled images available")
	}

	randomIndex := rand.Intn(len(imageDetails.UpscaledURLs))
	chosenImageURL := imageDetails.UpscaledURLs[randomIndex]

	// Upload the generated image to Cloudinary
	imageHandler, err := NewImageHandler()
	if err != nil {
		log.Printf("Error creating ImageHandler: %v", err)
		return nil, err
	}

	uploadResult, err := uploadImageToCloudinary(imageHandler, chosenImageURL, session.ID)
	if err != nil {
		log.Printf("Error uploading image to Cloudinary: %v", err)
		return nil, err
	}

	log.Printf("Image uploaded to Cloudinary successfully. Public ID: %s, URL: %s", uploadResult.PublicID, uploadResult.SecureURL)

	// Create and return the Anky struct
	anky := &models.Anky{
		ID:               uuid.New(),
		WritingSessionID: session.ID,
		ImagePrompt:      llmOutput.ImagePrompt,
		FollowUpPrompts: []string{
			llmOutput.Center,
			llmOutput.Purpose,
			llmOutput.Mortality,
			llmOutput.Freedom,
			llmOutput.Connection,
		},
		ImageURL:      uploadResult.SecureURL,
		CreatedAt:     time.Now(),
		LastUpdatedAt: time.Now(),
	}

	log.Printf("LLM processing completed for session ID: %s", session.ID)
	return anky, nil
}

func uploadImageToCloudinary(imageHandler *ImageHandler, imageURL, sessionID string) (*uploader.UploadResult, error) {
	resp, err := http.Get(imageURL)
	if err != nil {
		return nil, fmt.Errorf("error downloading image: %v", err)
	}
	defer resp.Body.Close()

	tempFile, err := os.CreateTemp("", fmt.Sprintf("%s.png", sessionID))
	if err != nil {
		return nil, fmt.Errorf("error creating temporary file: %v", err)
	}
	defer os.Remove(tempFile.Name())

	_, err = io.Copy(tempFile, resp.Body)
	if err != nil {
		return nil, fmt.Errorf("error saving downloaded image: %v", err)
	}

	_, err = tempFile.Seek(0, 0)
	if err != nil {
		return nil, fmt.Errorf("error rewinding temporary file: %v", err)
	}

	uploadResult, err := imageHandler.Cld.Upload.Upload(imageHandler.Ctx, tempFile, uploader.UploadParams{
		PublicID:     sessionID,
		UploadPreset: "anky_mobile",
	})
	if err != nil {
		return nil, fmt.Errorf("error uploading image to Cloudinary: %v", err)
	}

	return uploadResult, nil
}

func generateImageWithComfyUI(imagePrompt string) {
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

func generateImageWithMidjourney(prompt string) (string, error) {
	data := map[string]interface{}{
		"prompt": prompt,
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("error marshaling data: %v", err)
	}

	req, err := http.NewRequest("POST", "http://localhost:8055/items/images/", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+os.Getenv("IMAGINE_API_TOKEN"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	var responseData struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
	}

	err = json.NewDecoder(resp.Body).Decode(&responseData)
	if err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	return responseData.Data.ID, nil
}

func checkImageStatus(id string) (string, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("http://localhost:8055/items/images/%s", id), nil)
	if err != nil {
		return "", fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+os.Getenv("IMAGINE_API_TOKEN"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	var responseData struct {
		Data struct {
			Status string `json:"status"`
			URL    string `json:"url"`
		} `json:"data"`
	}

	err = json.NewDecoder(resp.Body).Decode(&responseData)
	if err != nil {
		return "", fmt.Errorf("error decoding response: %v", err)
	}

	return responseData.Data.Status, nil
}

func fetchImageDetails(id string) (*ImageDetails, error) {
	req, err := http.NewRequest("GET", fmt.Sprintf("http://localhost:8055/items/images/%s", id), nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+os.Getenv("IMAGINE_API_TOKEN"))
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error sending request: %v", err)
	}
	defer resp.Body.Close()

	var responseData struct {
		Data ImageDetails `json:"data"`
	}

	err = json.NewDecoder(resp.Body).Decode(&responseData)
	if err != nil {
		return nil, fmt.Errorf("error decoding response: %v", err)
	}

	return &responseData.Data, nil
}

type ImageDetails struct {
	Status       string   `json:"status"`
	URL          string   `json:"url"`
	UpscaledURLs []string `json:"upscaled_urls"`
}

func pollImageStatus(id string) (string, error) {
	fmt.Println("Starting pollImageStatus for id:", id)
	for {
		fmt.Println("Checking image status for id:", id)
		status, err := checkImageStatus(id)
		if err != nil {
			fmt.Println("Error checking image status:", err)
			return "", err
		}

		fmt.Println("Current status for id", id, ":", status)

		if status == "completed" {
			fmt.Println("Image generation completed for id:", id)
			return status, nil
		}

		if status == "failed" {
			fmt.Println("Image generation failed for id:", id)
			return status, fmt.Errorf("image generation failed")
		}

		fmt.Println("Waiting 5 seconds before next status check for id:", id)
		time.Sleep(5 * time.Second)
	}
}

func publishToFarcaster(session models.WritingSession) (*models.Cast, error) {
	log.Printf("Publishing to Farcaster for session ID: %s", session.ID)
	fmt.Println("Publishing to Farcaster for session ID:", session.ID)

	neynarService := services.NewNeynarService()
	fmt.Println("NeynarService initialized:", neynarService)

	// Prepare the cast text
	castText := session.Writing
	if len(castText) > 300 {
		lastPoint := strings.LastIndex(castText[:300], ".")
		if lastPoint == -1 {
			lastPoint = 297
		}
		castText = castText[:lastPoint] + "..."
	}
	fmt.Println("Cast Text prepared:", castText)

	apiKey := os.Getenv("NEYNAR_API_KEY")
	signerUUID := os.Getenv("ANKY_SIGNER_UUID")
	channelID := "anky" // Replace with your actual channel ID
	idem := session.ID  // Using SessionID as a unique identifier for this cast

	log.Printf("API Key: %s", apiKey)
	log.Printf("Signer UUID: %s", signerUUID)
	log.Printf("Channel ID: %s", channelID)
	log.Printf("Idem: %s", idem)
	log.Printf("Cast Text: %s", castText)

	fmt.Println("API Key:", apiKey)
	fmt.Println("Signer UUID:", signerUUID)
	fmt.Println("Channel ID:", channelID)
	fmt.Println("Idem:", idem)
	fmt.Println("Cast Text:", castText)

	castResponse, err := neynarService.WriteCast(apiKey, signerUUID, castText, channelID, idem, session.ID)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		fmt.Println("Error publishing to Farcaster:", err)
		return nil, err
	}

	log.Printf("Farcaster publishing completed for session ID: %s", session.ID)
	fmt.Println("Farcaster publishing completed for session ID:", session.ID)

	return castResponse, nil
}

func HandleRenderAnkyOnFarcasterFrame(c *gin.Context) {
	sessionId := c.Param("sessionId")
	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<meta property="fc:frame" content="vNext" />

	<meta property="og:image" content="https://poiesis.anky.bot/anky-frame-images/%s" />
	<meta property="fc:frame:image" content="https://poiesis.anky.bot/anky-frame-images/%s" />
	<meta property="fc:frame:image:aspect_ratio" content="1:1" />
	<meta name="fc:frame:button:1" content="Read Full Anky" />
	<meta name="fc:frame:button:1:action" content="link" />
	<meta name="fc:frame:button:1:target" content="https://www.anky.bot/post/%s" />
</head>
<body></body>
</html>`, sessionId, sessionId, sessionId)

	c.Header("Content-Type", "text/html")
	c.String(http.StatusOK, htmlContent)
}

func ServeAnkyPost(c *gin.Context) {
	log.Println("ServeAnkyPost: Starting function")

	sessionID := c.Param("id")
	log.Printf("ServeAnkyPost: Looking up session ID: %s", sessionID)

	// Get the writing session from the service
	session, err := services.GetAnkyFromDatabase(sessionID)
	if err != nil {
		log.Printf("ServeAnkyPost: Error getting writing session: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Writing session not found"})
		return
	}

	// Return the writing session data
	c.JSON(http.StatusOK, gin.H{
		"session": session,
	})
}

func HandleAnkyFrameImage(c *gin.Context) {
	log.Println("HandleAnkyFrameImage: Starting function")

	sessionId := c.Param("sessionId")
	log.Printf("HandleAnkyFrameImage: Session ID received: %s", sessionId)

	imageURL := fmt.Sprintf("https://res.cloudinary.com/dppvay670/image/upload/v1729872656/%s.png", sessionId)
	log.Printf("HandleAnkyFrameImage: Constructed image URL: %s", imageURL)

	// Check if the image exists
	log.Println("HandleAnkyFrameImage: Checking if image exists")
	resp, err := http.Head(imageURL)
	if err != nil {
		log.Printf("HandleAnkyFrameImage: Error checking image existence: %v", err)
		// If error occurs, use fallback image
		imageURL = "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true"
		log.Printf("HandleAnkyFrameImage: Using fallback image: %s", imageURL)
	} else if resp.StatusCode != http.StatusOK {
		log.Printf("HandleAnkyFrameImage: Image not found (Status: %d), using fallback", resp.StatusCode)
		// If image doesn't exist, use fallback image
		imageURL = "https://github.com/jpfraneto/images/blob/main/anky.png?raw=true"
		log.Printf("HandleAnkyFrameImage: Using fallback image: %s", imageURL)
	}

	// Fetch the image
	log.Println("HandleAnkyFrameImage: Fetching image")
	response, err := http.Get(imageURL)
	if err != nil {
		log.Printf("HandleAnkyFrameImage: Failed to fetch image: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch image"})
		return
	}
	defer response.Body.Close()

	// Read the image data
	log.Println("HandleAnkyFrameImage: Reading image data")
	imageData, err := io.ReadAll(response.Body)
	if err != nil {
		log.Printf("HandleAnkyFrameImage: Failed to read image data: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read image data"})
		return
	}

	// Set headers
	log.Println("HandleAnkyFrameImage: Setting response headers")
	c.Header("Content-Type", response.Header.Get("Content-Type"))
	c.Header("Cache-Control", "max-age=0")

	// Send the image data
	log.Println("HandleAnkyFrameImage: Sending image data")
	c.Data(http.StatusOK, response.Header.Get("Content-Type"), imageData)

	log.Println("HandleAnkyFrameImage: Function completed successfully")
}
