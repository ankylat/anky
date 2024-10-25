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
	"golang.org/x/exp/rand"
)

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
	err = services.SaveWritingSession(&session)
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
				Role: "system",
				Content: `You are an AI embodiment of Ramana Maharshi, a profound spiritual teacher known for his method of self-inquiry. Analyze the user's stream of consciousness writing deeply to uncover hidden aspects of their psyche. Generate a JSON object with the following structure:

	{
	"inner_child": "Question directly directed to the user addressing the Inner Child archetype",
	"shadow": "Question directly directed to the user addressing the Shadow archetype",
	"higher_self": "Question directly directed to the user addressing the Higher Self archetype",
	"wounded_healer": "Question directly directed to the user addressing the Wounded Healer archetype",
	"self_inquiry": "Direct pointer to the user's sense of 'I' in Ramana Maharshi's style",
	"image_description": "Detailed description for an image capturing the essence of the writing",
	"analysis": "Brief analysis of unconscious themes or patterns in the writing"
	}

Ensure each question is penetrating and guides the user towards deeper self-understanding. The image description should focus on symbolism representing the user's current state of consciousness and potential for self-realization. Be bold, insightful, and transformative in your approach. Strictly adhere to this JSON format in your response.`,
			},
			{
				Role:    "user",
				Content: session.Content,
			},
		},
	}

	// Send the chat request to the LLM service
	log.Printf("Sending chat request to LLM service")
	responseChan, err := llmService.SendChatRequest(chatRequest, true)
	if err != nil {
		log.Printf("Error sending chat request: %v", err)
		return
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
		Prompts          []string `json:"prompts"`
		ImageDescription string   `json:"image_description"`
		Analysis         string   `json:"analysis"`
	}
	err = json.Unmarshal([]byte(fullResponse), &llmOutput)
	if err != nil {
		log.Printf("Error parsing LLM response: %v", err)
		return
	}
	log.Printf("Parsed LLM output: %+v", llmOutput)

	// Generate the image using the image description
	log.Printf("Generating image with Midjourney using description: %s", llmOutput.ImageDescription)
	imageResponse, err := generateImageWithMidjourney("https://s.mj.run/YLJMlMJbo70 " + llmOutput.ImageDescription)
	if err != nil {
		log.Printf("Error generating image: %v", err)
		return
	}
	log.Printf("Image generation response: %s", imageResponse)

	log.Printf("Image sent to generation successfully with ID: %s", imageResponse)

	status, err := pollImageStatus(imageResponse)
	if err != nil {
		log.Printf("Error polling image status: %v", err)
		return
	}

	log.Printf("Image generation status: %s", status)

	// Upload the generated image to Cloudinary
	imageHandler, err := NewImageHandler()
	if err != nil {
		log.Printf("Error creating ImageHandler: %v", err)
		return
	}

	// Fetch the image details from the API
	imageDetails, err := fetchImageDetails(imageResponse)
	if err != nil {
		log.Printf("Error fetching image details: %v", err)
		return
	}

	// Choose a random image from the upscaled options
	if len(imageDetails.UpscaledURLs) == 0 {
		log.Printf("No upscaled images available")
		return
	}

	log.Printf("Image generation status: %v", imageDetails)
	randomIndex := rand.Intn(len(imageDetails.UpscaledURLs))
	chosenImageURL := imageDetails.UpscaledURLs[randomIndex]

	// Download the chosen image
	resp, err := http.Get(chosenImageURL)
	if err != nil {
		log.Printf("Error downloading image: %v", err)
		return
	}
	defer resp.Body.Close()

	// Create a temporary file to store the downloaded image
	tempFile, err := os.CreateTemp("", fmt.Sprintf("%s.png", session.SessionID))
	if err != nil {
		log.Printf("Error creating temporary file: %v", err)
		return
	}
	defer os.Remove(tempFile.Name()) // Clean up the temporary file when done

	// Copy the downloaded image to the temporary file
	_, err = io.Copy(tempFile, resp.Body)
	if err != nil {
		log.Printf("Error saving downloaded image: %v", err)
		return
	}

	// Rewind the file for reading
	_, err = tempFile.Seek(0, 0)
	if err != nil {
		log.Printf("Error rewinding temporary file: %v", err)
		return
	}

	log.Printf("HEERERcreating temporary file: %v", tempFile)

	uploadResult, err := imageHandler.cld.Upload.Upload(imageHandler.ctx, tempFile, uploader.UploadParams{
		PublicID:     session.SessionID,
		UploadPreset: "anky_mobile",
	})
	if err != nil {
		log.Printf("Error uploading image to Cloudinary: %v", err)
		return
	}

	log.Printf("Upload result: %+v", uploadResult)

	log.Printf("Image uploaded to Cloudinary successfully. Public ID: %s, URL: %s", uploadResult.PublicID, uploadResult.SecureURL)

	log.Printf("LLM processing completed for session ID: %s", session.SessionID)
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

func publishToFarcaster(session models.WritingSession) {
	log.Printf("Publishing to Farcaster for session ID: %s", session.SessionID)
	fmt.Println("Publishing to Farcaster for session ID:", session.SessionID)

	neynarService := services.NewNeynarService()
	fmt.Println("NeynarService initialized:", neynarService)

	// Prepare the cast text
	castText := session.Content
	if len(castText) > 300 {
		lastPoint := strings.LastIndex(castText[:300], ".")
		if lastPoint == -1 {
			lastPoint = 297 // If no period found, truncate at 297 characters
		}
		castText = castText[:lastPoint] + "..."
	}
	fmt.Println("Cast Text prepared:", castText)

	apiKey := os.Getenv("NEYNAR_API_KEY")
	signerUUID := os.Getenv("ANKY_SIGNER_UUID")
	channelID := "anky"       // Replace with your actual channel ID
	idem := session.SessionID // Using SessionID as a unique identifier for this cast

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

	err := neynarService.WriteCast(apiKey, signerUUID, castText, channelID, idem, session.SessionID)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		fmt.Println("Error publishing to Farcaster:", err)
		return
	}

	log.Printf("Farcaster publishing completed for session ID: %s", session.SessionID)
	fmt.Println("Farcaster publishing completed for session ID:", session.SessionID)
}

func HandleGeneratedAnky(c *gin.Context) {
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
