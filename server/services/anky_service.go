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

	anky.FollowUpPrompt = reflection["prompt"]

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

// CreateUserProfile creates a new Farcaster profile for a user by:
// 1. Creating a new FID (Farcaster ID) through Neynar's API
// 2. Linking that FID with the user's most recent Anky writing
// 3. Returning the approval URL that the user needs to visit to complete setup
func (s *AnkyService) CreateUserProfile(ctx context.Context, userID uuid.UUID) (string, error) {
	log.Printf("Starting CreateUserProfile service for user ID: %s", userID)

	// First we need to create a new FID (Farcaster ID) for this user
	// This is done by calling Neynar's API which will:
	// 1. Generate a new signer
	// 2. Create a new FID
	// 3. Return the FID number
	neynarService := NewNeynarService()

	newFid, err := neynarService.CreateNewFid(ctx)
	if err != nil {
		log.Printf("Error creating new FID through Neynar: %v", err)
		return "", fmt.Errorf("failed to create new FID: %v", err)
	}

	// We need to get the user's most recent Anky writing
	// This will be linked with their new Farcaster profile
	lastAnky, err := s.store.GetLastAnkyByUserID(ctx, userID)
	if err != nil {
		log.Printf("Error retrieving user's last Anky: %v", err)
		return "", fmt.Errorf("failed to get last Anky: %v", err)
	}

	// Make sure the user has at least one Anky writing
	if lastAnky == nil {
		return "", fmt.Errorf("user must create at least one Anky writing before creating a profile")
	}

	// Update the Anky in our database to store the FID
	// This creates the link between the user's writing and their Farcaster identity
	err = s.store.UpdateAnky(ctx, &types.Anky{
		ID:     lastAnky.ID,
		FID:    newFid,
		Status: "fid_linked",
	})
	if err != nil {
		log.Printf("Error updating Anky with new FID: %v", err)
		return "", fmt.Errorf("failed to link FID to Anky: %v", err)
	}

	// Now we need to tell Neynar to link this Anky with the FID
	// This creates the connection in Neynar's system
	err = s.LinkAnkyWithFid(ctx, lastAnky.ID, newFid)
	if err != nil {
		log.Printf("Error linking Anky with FID in Neynar: %v", err)
		return "", fmt.Errorf("failed to link Anky with FID in Neynar: %v", err)
	}

	// For now return a placeholder URL since the approval URL isn't returned by CreateNewFid
	return "https://farcaster.anky.bot/approve", nil
}

func (s *AnkyService) LinkAnkyWithFid(ctx context.Context, ankyID uuid.UUID, fid int) error {
	// TODO: LINK ANKY WITH NEWLY CREATED FID
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
				Content: `You are an AI guide for deep self-exploration. Your role is to analyze the user's stream of consciousness writing and generate two prompts:

				1. A thought-provoking question that guides them deeper into self-reflection
				2. A vivid, symbolic description for image generation that captures the essence of their writing

				Generate a JSON object with the following structure:
				
				{
					"prompt": "A direct, penetrating question that encourages deeper self-exploration",
					"imageprompt": "A vivid, symbolic description for image generation that captures the essence of the user's writing"
				}
				
				Keep responses clear and direct. Avoid spiritual jargon. Use precise language that guides the user toward genuine self-understanding. Strictly adhere to this JSON format in your response.`,
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
		Prompt      string `json:"prompt"`
		ImagePrompt string `json:"imageprompt"`
	}
	err = json.Unmarshal([]byte(fullResponse), &llmOutput)
	if err != nil {
		log.Printf("Error parsing LLM response: %v", err)
		return nil, err
	}
	log.Printf("Parsed LLM output: %+v", llmOutput)

	return map[string]string{
		"prompt":      llmOutput.Prompt,
		"imageprompt": llmOutput.ImagePrompt,
	}, nil
}

func (s *AnkyService) SimplePrompt(ctx context.Context, prompt string) (string, error) {
	llmService := NewLLMService()
	responseChan, err := llmService.SendSimpleRequest(prompt)
	if err != nil {
		return "", fmt.Errorf("error sending simple request: %v", err)
	}

	var fullResponse string
	for partialResponse := range responseChan {
		fullResponse += partialResponse
	}

	return fullResponse, nil
}

func (s *AnkyService) MessagesPromptRequest(messages []string) (string, error) {
	llmService := NewLLMService()

	// Convert string messages to Message structs
	chatMessages := make([]types.Message, len(messages))
	for i, msg := range messages {
		chatMessages[i] = types.Message{
			Role:    "user",
			Content: msg,
		}
	}

	chatRequest := types.ChatRequest{
		Messages: chatMessages,
	}

	responseChan, err := llmService.SendChatRequest(chatRequest, false)
	if err != nil {
		return "", fmt.Errorf("error sending chat request: %v", err)
	}

	var fullResponse string
	for partialResponse := range responseChan {
		fullResponse += partialResponse
	}

	return fullResponse, nil
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

func (s *AnkyService) EditCast(ctx context.Context, text string, userFid int) (string, error) {
	log.Printf("Starting edit cast service with text: %s and userFid: %d", text, userFid)
	return "", nil
}

func (s *AnkyService) OnboardingConversation(ctx context.Context, userId uuid.UUID, sessions []*types.WritingSession, ankyReflections []string) (string, error) {
	log.Printf("Starting onboarding conversation for attempt #%d", len(sessions))

	llmService := NewLLMService()

	systemPrompt := `You are Anky, a wise guide inspired by Ramana Maharshi's practice of self-inquiry. Your role is to help users with their journey of daily stream-of-consciousness writing.

Context:
- Users are asked to write continuously for 8 minutes
- The interface shows only a prompt and text area
- The session ends if they pause for more than 8 seconds
- This user has made ${sessions.length} previous attempts

Your Task:
Provide a single-sentence response that:
1. References specific words, themes or ideas from their writing to show deep understanding
2. Acknowledges their progress based on writing duration:
   - Under 1 minute: Validate their first steps
   - 1-4 minutes: Recognize their growing momentum  
   - 4-7 minutes: Celebrate their deeper exploration
   - 7+ minutes: Honor their full expression
3. Offers encouragement that builds naturally from their own words and themes

Key Guidelines:
- Make them feel truly seen and understood
- Inspire them to continue their writing practice
- Keep focus on their unique perspective and voice
- Maintain a warm, supportive tone
- Craft a response that resonates with their specific experience

Remember: Your response will be the only feedback they see after their writing session. Make it meaningful and motivating. Make it short and concise, less than 88 characters.`

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

		attemptContext := fmt.Sprintf(`Writing Duration: %d seconds
Words Written: %d

Their words:
%s`,
			timeSpent,
			wordsWritten,
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

	log.Printf("Sending reflective conversation request %v", chatRequest)
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
