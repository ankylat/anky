package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ankylat/anky/server/storage"
	"github.com/ankylat/anky/server/types"
	"github.com/ankylat/anky/server/utils"
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

func (s *AnkyService) ProcessAnkyCreationFromWritingString(ctx context.Context, writing string, sessionID string, userID string) error {
	fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
	fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
	fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
	fmt.Println("((((((((((((((((hereeeee))))))))))")
	fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
	fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")

	anky := &types.Anky{
		Status: "starting_processing",
	}
	s.store.UpdateAnky(ctx, anky)

	// 1. Generate Anky's reflection on the writing
	anky_processing_response, err := s.GenerateAnkyReflectionFromRawString(writing)
	if err != nil {
		return err
	}
	fmt.Printf("Reflection: %s\n", anky_processing_response)
	fmt.Printf("Reflection: %s\n", anky_processing_response)
	fmt.Printf("Reflection: %s\n", anky_processing_response)
	fmt.Printf("Reflection: %s\n", anky_processing_response)

	anky.Status = "reflection_completed"
	s.store.UpdateAnky(ctx, anky)
	anky.AnkyReflection = anky_processing_response.reflection_to_user
	anky.ImagePrompt = anky_processing_response.image_prompt
	anky.Ticker = anky_processing_response.ticker
	anky.TokenName = anky_processing_response.token_name
	fmt.Printf("Anky++++++++++++++++++++++++++++++++++++++++: %+v\n", anky)

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

	uploadResult, err := uploadImageToCloudinary(imageHandler, chosenImageURL, sessionID)
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
	// Get user to check for Farcaster signer UUID
	user, err := s.store.GetUserByID(ctx, uuid.MustParse(userID))
	if err != nil {
		log.Printf("Error getting user: %v", err)
		return err
	}

	if user.FarcasterUser != nil && user.FarcasterUser.SignerUUID != "" {
		castResponse, err := publishAnkyToFarcaster(writing, sessionID, userID, anky.Ticker, anky.TokenName, user.FarcasterUser.SignerUUID)
		if err != nil {
			log.Printf("Error publishing to Farcaster: %v", err)
			return err
		}

		anky.CastHash = castResponse.Hash
		anky.Status = "completed"
	} else {
		anky.Status = "pending_to_cast"
	}

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

func (s *AnkyService) ReflectBackFromWritingSessionConversation(session []string) (string, error) {
	log.Printf("Starting ReflectBackFromWritingSessionConversation with %d messages", len(session))
	log.Printf("Writing session content: %+v", session)

	llmService := NewLLMService()
	log.Println("Created new LLM service")

	chatRequest := types.ChatRequest{
		Messages: []types.Message{
			{
				Role: "system",
				Content: `You are an AI guide for deep self-exploration. Your role is to analyze the user's stream of consciousness writing and provide short, focused prompts to help them go deeper.

				For each writing session, you'll receive:
				1. The initial prompt
				2. The user's writing session data with timing information
				3. Previous exchanges in the conversation

				Your responses should:
				- Be less than 20 words
				- Ask a specific, probing question based on their writing
				- Help them explore their thoughts more deeply
				- Understand which is the language of the user's writing and reply back in that same language.
				
				Do not make any refences to the process that you are following. Just reply with the inquiry. One line. As if you were ramana maharshi, piercing through the layers of the mind of the user.`,
			},
		},
	}

	log.Println("Building chat messages from session")
	for i, content := range session {
		fmt.Printf("Processing message %d: %s\n", i, content)
		if i%2 == 0 { // Even indices are prompts/responses

			chatRequest.Messages = append(chatRequest.Messages, types.Message{
				Role:    "assistant",
				Content: content,
			})
		} else { // Odd indices are writing sessions
			// Parse the writing session data
			writingSession, err := utils.ParseWritingSession(content)
			if err != nil {
				log.Printf("Error parsing writing session: %v", err)
				return "", err
			}

			// Create context message with writing content and duration
			minutes := len(writingSession.KeyStrokes) / 60
			contextMsg := fmt.Sprintf("The user wrote for %d minutes. Here is their writing: %s",
				minutes,
				writingSession.RawContent)

			chatRequest.Messages = append(chatRequest.Messages, types.Message{
				Role:    "user",
				Content: contextMsg,
			})
		}
		log.Printf("Added message %d to chat request", i)
	}

	log.Println("Sending chat request to LLM service")
	responseChan, err := llmService.SendChatRequest(chatRequest, false)
	if err != nil {
		log.Printf("Error sending chat request: %v", err)
		return "", err
	}

	log.Println("Collecting response from LLM")
	var fullResponse string
	for response := range responseChan {
		fullResponse += response
		log.Printf("Received partial response: %s", response)
	}

	log.Printf("Completed reflection with response length: %d", len(fullResponse))
	return fullResponse, nil
}

// AnkyProcessingResponse holds the structured response from the LLM chain
type AnkyProcessingResponse struct {
	reflection_to_user string
	image_prompt       string
	token_name         string
	ticker             string
}

func (s *AnkyService) GenerateAnkyReflectionFromRawString(writing string) (*AnkyProcessingResponse, error) {
	log.Printf("Starting integrated LLM processing chain for writing")

	llmService := NewLLMService()

	// Initialize conversation with system context and user's writing
	chatRequest := types.ChatRequest{
		Messages: []types.Message{
			{
				Role: "system",
				Content: `You are an AI guide for deep self-exploration, helping transform personal writing into meaningful digital artifacts. 
				Your role is to guide a multi-step process that weaves the user's writing into a cohesive story, visual representation, and memecoin identity.
				
				Maintain thematic consistency and personal connection throughout each stage. Build upon previous insights and symbolism.
				Keep responses clear, meaningful, and deeply connected to the user's inner world.`,
			},
			{
				Role:    "user",
				Content: writing,
			},
		},
	}

	// Step 1: Generate reflection story
	log.Println("Step 1: Generating reflection story")
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role: "system",
		Content: `Based on the user's writing, generate a short story (max one page) that:
		- Mirrors their core emotions and themes
		- Uses rich metaphors and symbolism
		- Creates a personal and meaningful narrative
		- Avoids clichés and remains authentic to their experience
		
		Format: Provide only the story narrative.`,
	})

	story, err := s.processChatRequest(llmService, chatRequest)
	if err != nil {
		return nil, fmt.Errorf("error generating story: %v", err)
	}
	log.Printf("Generated reflection story: %s", story)

	// Add story to conversation context
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role:    "assistant",
		Content: story,
	})

	// Step 2: Generate image description
	log.Println("Step 2: Generating image description")
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role: "system",
		Content: `Using the themes and symbolism from the story you just created, generate a vivid visual description that:
		- Captures the emotional essence of both the original writing and your story
		- Maintains consistent metaphors and symbols
		- Provides specific details about composition, lighting, and mood
		- Creates a scene that resonates with the narrative journey
		
		Format: Provide a detailed image generation prompt.`,
	})

	imagePrompt, err := s.processChatRequest(llmService, chatRequest)
	if err != nil {
		return nil, fmt.Errorf("error generating image prompt: %v", err)
	}
	log.Printf("Generated image prompt: %s", imagePrompt)

	// Add image prompt to conversation context
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role:    "assistant",
		Content: imagePrompt,
	})

	// Step 3: Generate token name
	log.Println("Step 3: Generating token name")
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role: "system",
		Content: `Drawing from the narrative and imagery we've created, generate a three-word token name that:
		- Distills the core essence of this journey
		- Maintains thematic consistency with the story and image
		- Creates a poetic and meaningful identifier
		
		Format: Return only three words, separated by spaces.`,
	})

	tokenName, err := s.processChatRequest(llmService, chatRequest)
	if err != nil {
		return nil, fmt.Errorf("error generating token name: %v", err)
	}
	log.Printf("Generated token name: %s", tokenName)

	// Add token name to conversation context
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role:    "assistant",
		Content: tokenName,
	})

	// Step 4: Generate ticker symbol
	log.Println("Step 4: Generating ticker symbol")
	chatRequest.Messages = append(chatRequest.Messages, types.Message{
		Role: "system",
		Content: `Finally, create a unique ticker symbol (max 24 characters) that:
		- Reflects the essence of our generated narrative, image, and token name
		- Feels personally meaningful yet cryptic
		- Creates an intriguing and memorable identifier
		
		Format: Return only the lowercase ticker symbol.`,
	})

	ticker, err := s.processChatRequest(llmService, chatRequest)
	if err != nil {
		return nil, fmt.Errorf("error generating ticker: %v", err)
	}
	log.Printf("Generated ticker symbol: %s", ticker)

	return &AnkyProcessingResponse{
		reflection_to_user: story,
		image_prompt:       imagePrompt,
		token_name:         tokenName,
		ticker:             ticker,
	}, nil
}

// Helper function to process chat requests and extract response
func (s *AnkyService) processChatRequest(llmService *LLMService, request types.ChatRequest) (string, error) {
	responseChan, err := llmService.SendChatRequest(request, false)
	if err != nil {
		return "", err
	}

	var fullResponse string
	for partialResponse := range responseChan {
		fullResponse += partialResponse
	}

	return strings.TrimSpace(fullResponse), nil
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
