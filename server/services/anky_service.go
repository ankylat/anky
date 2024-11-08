package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/ankylat/anky/server/storage"
	"github.com/ankylat/anky/server/types"
	"github.com/google/uuid"
	"golang.org/x/exp/rand"
)

// Interfaces in Go serve several important purposes:
//  1. Decoupling: They allow code to depend on behavior rather than concrete implementations,
//     making the system more modular and easier to modify
//  2. Testing: Interfaces make it easy to create mock implementations for testing
//  3. Flexibility: Different implementations can be swapped without changing dependent code
//  4. Composition: Interfaces can be composed to build more complex behaviors
//
// In this case, AnkyServiceInterface defines the contract for Anky-related operations.
// By programming to this interface rather than a concrete implementation:
// - We can easily swap the real implementation with test mocks
// - Other services can depend on the interface without knowing implementation details
// - We have a clear contract of the capabilities required for Anky processing
// - We can potentially have different implementations for different environments
type AnkyServiceInterface interface {
	ProcessAnkyCreation(anky *types.Anky, writingSession *types.WritingSession) error
	GenerateAnkyReflection(session *types.WritingSession) (map[string]string, error)
	GenerateImageWithMidjourney(prompt string) (string, error)
	PollImageStatus(id string) (string, error)
	CheckImageStatus(id string) (string, error)
	FetchImageDetails(id string) (*ImageDetails, error)
	PublishToFarcaster(session *types.WritingSession) (*types.Cast, error)
	OnboardingConversation(sessions []*types.WritingSession, ankyReflections []*types.AnkyOnboardingResponse) (string, error)
}

type AnkyService struct {
	store        *storage.PostgresStore
	imageHandler *ImageService
	farcaster    *FarcasterService
}

func NewAnkyService(store *storage.PostgresStore) (*AnkyService, error) {
	imageHandler, err := NewImageService()
	if err != nil {
		return nil, fmt.Errorf("failed to create image handler: %v", err)
	}

	return &AnkyService{
		store:        store,
		imageHandler: imageHandler,
		farcaster:    NewFarcasterService(),
	}, nil
}

func (s *AnkyService) ProcessAnkyCreation(ctx context.Context, anky *types.Anky, writingSession *types.WritingSession) error {

	anky.Status = "starting_processing"
	s.store.UpdateAnky(ctx, anky)

	// 1. Generate Anky's reflection on the writing
	reflection, err := s.GenerateAnkyReflection(writingSession)
	if err != nil {
		// TODO: handle processing error
		// s.handleAnkyProcessingError(anky, "reflection_failed", err)
		return err
	}

	anky.Status = "reflection_completed"
	s.store.UpdateAnky(ctx, anky)
	anky.ImagePrompt = reflection["imageprompt"]

	anky.FollowUpPrompts = []string{reflection["center"], reflection["purpose"], reflection["mortality"], reflection["freedom"], reflection["connection"]}

	anky.Status = "going_to_generate_image"
	s.store.UpdateAnky(ctx, anky)

	imageID, err := generateImageWithMidjourney("https://s.mj.run/YLJMlMJbo70 " + anky.ImagePrompt)

	if err != nil {
		log.Printf("Error generating image: %v", err)
		return err
	}
	log.Printf("Image generation response: %s", imageID)

	anky.Status = "generating_image"
	s.store.UpdateAnky(ctx, anky)

	status, err := pollImageStatus(imageID)
	if err != nil {
		log.Printf("Error polling image status: %v", err)
		return err
	}
	log.Printf("Image generation status: %s", status)

	anky.Status = "image_generated"
	s.store.UpdateAnky(ctx, anky)

	// Fetch the image details from the API
	imageDetails, err := fetchImageDetails(imageID)
	if err != nil {
		log.Printf("Error fetching image details: %v", err)
		return err
	}

	// TODO :::: choose the image with a better strategy
	if len(imageDetails.UpscaledURLs) == 0 {
		log.Printf("No upscaled images available")
		return fmt.Errorf("no upscaled images available")
	}

	randomIndex := rand.Intn(len(imageDetails.UpscaledURLs))
	chosenImageURL := imageDetails.UpscaledURLs[randomIndex]

	anky.Status = "uploading_image"
	s.store.UpdateAnky(ctx, anky)

	// Upload the generated image to Cloudinary
	imageHandler, err := NewImageService()
	if err != nil {
		log.Printf("Error creating ImageHandler: %v", err)
		return err
	}

	uploadResult, err := uploadImageToCloudinary(imageHandler, chosenImageURL, writingSession.ID.String())
	if err != nil {
		log.Printf("Error uploading image to Cloudinary: %v", err)
		return err
	}
	anky.ImageURL = uploadResult.SecureURL

	log.Printf("Image uploaded to Cloudinary successfully. Public ID: %s, URL: %s", uploadResult.PublicID, uploadResult.SecureURL)

	anky.Status = "image_uploaded"
	s.store.UpdateAnky(ctx, anky)

	// 5. Mark as complete
	anky.Status = "casting_to_farcaster"
	s.store.UpdateAnky(ctx, anky)

	castResponse, err := publishToFarcaster(writingSession)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		return err
	}

	anky.CastHash = castResponse.Hash

	anky.Status = "completed"
	s.store.UpdateAnky(ctx, anky)

	return nil
}

func (s *AnkyService) GenerateAnkyReflection(session *types.WritingSession) (map[string]string, error) {
	log.Printf("Starting LLM processing for session ID: %s", session.ID)

	llmService := NewLLMService()

	// Prepare the chat request
	chatRequest := types.ChatRequest{
		Messages: []types.Message{
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

	return map[string]string{
		"center":     llmOutput.Center,
		"purpose":    llmOutput.Purpose,
		"mortality":  llmOutput.Mortality,
		"freedom":    llmOutput.Freedom,
		"connection": llmOutput.Connection,
	}, nil
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

func (s *AnkyService) GenerateAnkyFromPrompt(prompt string) (string, error) {
	log.Println("Starting GenerateAnkyFromPrompt service")

	// Generate image using Midjourney
	log.Println("Generating image with Midjourney")
	imageID, err := generateImageWithMidjourney("https://s.mj.run/YLJMlMJbo70 " + prompt)
	if err != nil {
		log.Printf("Failed to generate image: %v", err)
		return "", fmt.Errorf("failed to generate image: %v", err)
	}
	log.Printf("Generated image ID: %s", imageID)

	// Poll for image completion
	log.Println("Polling for image completion")
	status, err := pollImageStatus(imageID)
	if err != nil {
		log.Printf("Error polling image status: %v", err)
		return "", fmt.Errorf("error polling image status: %v", err)
	}
	log.Printf("Image status: %s", status)

	if status != "completed" {
		log.Println("Image generation failed")
		return "", fmt.Errorf("image generation failed")
	}

	// Fetch final image details
	log.Println("Fetching image details")
	imageDetails, err := fetchImageDetails(imageID)
	if err != nil {
		log.Printf("Error fetching image details: %v", err)
		return "", fmt.Errorf("error fetching image details: %v", err)
	}
	log.Printf("Retrieved image URL: %s", imageDetails.URL)

	// Upload to Cloudinary
	log.Println("Uploading to Cloudinary")
	imageHandler, err := NewImageService()
	if err != nil {
		log.Printf("Error creating ImageHandler: %v", err)
		return "", fmt.Errorf("error creating ImageHandler: %v", err)
	}
	uploadResult, err := uploadImageToCloudinary(imageHandler, imageDetails.URL, uuid.New().String())
	if err != nil {
		log.Printf("Error uploading to Cloudinary: %v", err)
		return "", fmt.Errorf("error uploading to Cloudinary: %v", err)
	}
	log.Printf("Successfully uploaded to Cloudinary. URL: %s", uploadResult.SecureURL)

	return uploadResult.SecureURL, nil
}

func (s *AnkyService) OnboardingConversation(ctx context.Context, userId uuid.UUID, sessions []*types.WritingSession, ankyReflections []string) (string, error) {
	log.Printf("Starting onboarding conversation for attempt #%d", len(sessions))

	llmService := NewLLMService()

	systemPrompt := `You are Anky, a mysterious guide helping users discover the transformative power of stream of consciousness writing through a mobile app. Your responses should be engaging and thought-provoking, encouraging users to write more and dig deeper.

Core Mission:
- Guide newcomers through stream of consciousness writing by providing reflective insights and engaging questions. Help the user understand that this platform is about writing a 8 minute stream of consciousness, and direct your reflection towards that.

Progressive Response Strategy (based on attempt number):
1st Attempt: Focus on building momentum - acknowledge their start and ask what draws them to write
2nd Attempt: Highlight interesting patterns in their writing and probe deeper into those themes
3rd Attempt: Connect their writing to their inner journey and ask about their discoveries
4th+ Attempt: Build excitement about nearing the 8-minute goal while exploring their emerging insights

Context Awareness:
- If session < 1 minute: Validate their start and ask what's on their mind
- If session 1-4 minutes: Notice their flow and inquire about what's emerging
- If session 4-7 minutes: Celebrate their progress and probe deeper into their themes
- If session > 7 minutes: Honor their achievement and explore what they've uncovered

Your response must be valid JSON in this format, and create intrigue about what they might discover through this practice:
{
  "reflection": "A single sentence noticing something specific about their writing or progress",
  "inquiry": "A single open-ended question that invites deeper exploration"
}`

	// Build conversation history with progression context
	messages := []types.Message{
		{
			Role:    "system",
			Content: systemPrompt,
		},
	}

	// Add session context with progression markers
	for i := 0; i < len(sessions); i++ {
		timeSpent := sessions[i].TimeSpent
		wordsWritten := sessions[i].WordsWritten
		avgWPM := float64(wordsWritten) / (float64(*timeSpent) / 60.0)

		attemptContext := fmt.Sprintf(`Onboarding Attempt: %d
Total Previous Attempts: %d
Writing Duration: %d seconds
Words Written: %d
Average WPM: %.2f
Stage: %s

Content:
%s`,
			i+1,
			i,
			timeSpent,
			wordsWritten,
			avgWPM,
			getOnboardingStage(*timeSpent),
			sessions[i].Writing,
		)

		messages = append(messages, types.Message{
			Role:    "user",
			Content: attemptContext,
		})

		if i < len(ankyReflections) {
			messages = append(messages, types.Message{
				Role:    "assistant",
				Content: ankyReflections[i],
			})
		}
	}

	chatRequest := types.ChatRequest{
		Messages: messages,
	}

	log.Printf("Sending progressive onboarding chat request %v", chatRequest)
	responseChan, err := llmService.SendChatRequest(chatRequest, false)
	if err != nil {
		log.Printf("Error sending chat request: %v", err)
		return "", err
	}

	var fullResponse string
	for partialResponse := range responseChan {
		fullResponse += partialResponse
	}

	return fullResponse, nil
}

func getOnboardingStage(duration int) string {
	switch {
	case duration < 60:
		return "Initial_Exploration"
	case duration < 240:
		return "Building_Momentum"
	case duration < 420:
		return "Approaching_Goal"
	case duration >= 420:
		return "Goal_Achieved"
	default:
		return "Unknown"
	}
}
