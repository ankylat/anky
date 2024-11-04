package main

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

	"github.com/ankylat/anky/server/database"
	"github.com/ankylat/anky/server/handlers"
	"github.com/ankylat/anky/server/models"
	"github.com/ankylat/anky/server/services"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
	"golang.org/x/exp/rand"
)

func WriteJSON(w http.ResponseWriter, status int, v any) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	return json.NewEncoder(w).Encode(v)
}

type apiFunc func(w http.ResponseWriter, r *http.Request) error

type ApiError struct {
	Error string `json:"error"`
}

func makeHTTPHandleFunc(f apiFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := f(w, r); err != nil {
			WriteJSON(w, http.StatusBadRequest, ApiError{Error: err.Error()})
		}
	}
}

type APIServer struct {
	listenAddr string
	store      database.Storage
}

func NewAPIServer(listenAddr string, store database.Storage) (*APIServer, error) {
	return &APIServer{
		listenAddr: listenAddr,
		store:      store,
	}, nil
}

func (s *APIServer) Run() {
	router := mux.NewRouter()

	router.HandleFunc("/", makeHTTPHandleFunc(s.handleHelloWorld))
	router.HandleFunc("/user", makeHTTPHandleFunc(s.handleUser))
	router.HandleFunc("/writing-session-started", makeHTTPHandleFunc(s.handleWritingSessionStarted))
	router.HandleFunc("/writing-session-ended", makeHTTPHandleFunc(s.handleWritingSessionEnded))
	router.HandleFunc("/writing-session/{sessionId}", makeHTTPHandleFunc(s.handleGetWritingSession))
	log.Println("Server running on port:", s.listenAddr)
	http.ListenAndServe(s.listenAddr, router)
}

func (s *APIServer) handleHelloWorld(w http.ResponseWriter, r *http.Request) error {
	return WriteJSON(w, http.StatusOK, map[string]string{"message": "Hello, World!"})
}

func (s *APIServer) handleUser(w http.ResponseWriter, r *http.Request) error {
	if r.Method == "GET" {
		return s.handleGetUser(w, r)
	}
	if r.Method == "POST" {
		return s.handleCreateUser(w, r)
	}
	return nil
}

// GET /user
func (s *APIServer) handleGetUser(w http.ResponseWriter, r *http.Request) error {
	accounts, err := s.store.GetUsers()
	if err != nil {
		return err
	}
	return WriteJSON(w, http.StatusOK, accounts)
}

// POST /user
func (s *APIServer) handleCreateUser(w http.ResponseWriter, r *http.Request) error {
	createUserRequest := new(models.CreateUserRequest)
	if err := json.NewDecoder(r.Body).Decode(createUserRequest); err != nil {
		return err
	}

	user := models.NewUser(createUserRequest.PrivyUser)
	tokenString, err := createJWT(user)
	if err != nil {
		return err
	}
	user.JWT = tokenString
	if err := s.store.CreateUser(user); err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, user)
}

func createJWT(user *models.User) (string, error) {
	claims := &jwt.MapClaims{
		"expiresAt": time.Now().Add(400 * 24 * time.Hour).Unix(),
		"userID":    user.ID,
	}

	secretKey := os.Getenv("JWT_SECRET")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(secretKey))
}

// POST /writing-session-started
func (s *APIServer) handleWritingSessionStarted(w http.ResponseWriter, r *http.Request) error {
	newWritingSessionRequest := new(models.CreateWritingSessionRequest)
	if err := json.NewDecoder(r.Body).Decode(newWritingSessionRequest); err != nil {
		return err
	}

	userSessions, err := s.store.GetUserWritingSessions(newWritingSessionRequest.UserID)
	if err != nil {
		return err
	}

	sessionIndex := len(userSessions)

	writingSession := models.NewWritingSession(newWritingSessionRequest.SessionID, newWritingSessionRequest.UserID, newWritingSessionRequest.Prompt, sessionIndex)

	if err := s.store.CreateWritingSession(writingSession); err != nil {
		return err
	}

	fmt.Printf("%+v\n", writingSession)

	return WriteJSON(w, http.StatusOK, writingSession)
}

// POST /writing-session-ended
func (s *APIServer) handleWritingSessionEnded(w http.ResponseWriter, r *http.Request) error {
	fmt.Println("Handling writing session ended request...")

	newWritingSessionEndRequest := new(models.CreateWritingSessionEndRequest)
	if err := json.NewDecoder(r.Body).Decode(newWritingSessionEndRequest); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		return err
	}

	fmt.Printf("Looking up writing session with ID: %s\n", newWritingSessionEndRequest.SessionID)
	writingSession, err := s.store.GetWritingSessionById(newWritingSessionEndRequest.SessionID)
	if err != nil {
		fmt.Printf("Error getting writing session: %v\n", err)
		return err
	}

	fmt.Println("Updating writing session fields...")
	writingSession.EndingTimestamp = newWritingSessionEndRequest.EndingTimestamp
	writingSession.WordsWritten = newWritingSessionEndRequest.WordsWritten
	writingSession.NewenEarned = newWritingSessionEndRequest.NewenEarned
	writingSession.TimeSpent = newWritingSessionEndRequest.TimeSpent
	writingSession.IsAnky = newWritingSessionEndRequest.IsAnky
	writingSession.ParentAnkyID = newWritingSessionEndRequest.ParentAnkyID
	writingSession.AnkyResponse = newWritingSessionEndRequest.AnkyResponse
	writingSession.Status = "completed"

	if writingSession.IsAnky && writingSession.TimeSpent >= 480 {
		fmt.Println("Initiating Anky creation process...")

		// Create initial Anky record with "processing" status
		anky := models.NewAnky(writingSession.ID, writingSession.Prompt, writingSession.UserID)

		if err := s.store.CreateAnky(anky); err != nil {
			return fmt.Errorf("error creating initial anky record: %v", err)
		}

		// Start async processing
		go s.processAnkyCreation(anky, writingSession)

		// Update writing session with the anky ID
		writingSession.AnkyID = anky.ID.String()
	}

	fmt.Printf("Saving writing session with updated status: %s\n", writingSession.Status)
	if err := s.store.UpdateWritingSession(writingSession); err != nil {
		fmt.Printf("Error updating writing session: %v\n", err)
		return err
	}

	fmt.Println("Writing session successfully updated:")
	fmt.Printf("%+v\n", writingSession)

	return WriteJSON(w, http.StatusOK, writingSession)
}

func (s *APIServer) handleGetWritingSession(w http.ResponseWriter, r *http.Request) error {
	sessionID, err := getSessionID(r)
	if err != nil {
		return err
	}

	session, err := s.store.GetWritingSessionById(sessionID)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, session)
}

func getSessionID(r *http.Request) (string, error) {
	sessionID := mux.Vars(r)["sessionId"]
	if sessionID == "" {
		return "", fmt.Errorf("no session ID provided")
	}
	return sessionID, nil
}

func (s *APIServer) processAnkyCreation(anky *models.Anky, writingSession *models.WritingSession) error {
	// Update status to show we're starting
	anky.Status = "starting_processing"
	s.store.UpdateAnkyStatus(anky)

	// 1. Generate Anky's reflection on the writing
	reflection, err := s.generateAnkyReflection(writingSession)
	if err != nil {
		// TODO: handle processing error
		// s.handleAnkyProcessingError(anky, "reflection_failed", err)
		return err
	}

	anky.Status = "reflection_completed"
	s.store.UpdateAnkyStatus(anky)
	anky.ImagePrompt = reflection["imageprompt"]

	anky.FollowUpPrompts = []string{reflection["center"], reflection["purpose"], reflection["mortality"], reflection["freedom"], reflection["connection"]}

	anky.Status = "going_to_generate_image"
	s.store.UpdateAnkyStatus(anky)

	imageID, err := generateImageWithMidjourney("https://s.mj.run/YLJMlMJbo70 " + anky.ImagePrompt)

	if err != nil {
		log.Printf("Error generating image: %v", err)
		return err
	}
	log.Printf("Image generation response: %s", imageID)

	anky.Status = "generating_image"
	s.store.UpdateAnkyStatus(anky)

	status, err := pollImageStatus(imageID)
	if err != nil {
		log.Printf("Error polling image status: %v", err)
		return err
	}
	log.Printf("Image generation status: %s", status)

	anky.Status = "image_generated"
	s.store.UpdateAnkyStatus(anky)

	// Fetch the image details from the API
	imageDetails, err := fetchImageDetails(imageID)
	if err != nil {
		log.Printf("Error fetching image details: %v", err)
		return err
	}

	// Choose a random image from the upscaled options
	if len(imageDetails.UpscaledURLs) == 0 {
		log.Printf("No upscaled images available")
		return fmt.Errorf("no upscaled images available")
	}

	randomIndex := rand.Intn(len(imageDetails.UpscaledURLs))
	chosenImageURL := imageDetails.UpscaledURLs[randomIndex]

	anky.Status = "uploading_image"
	s.store.UpdateAnkyStatus(anky)

	// Upload the generated image to Cloudinary
	imageHandler, err := handlers.NewImageHandler()
	if err != nil {
		log.Printf("Error creating ImageHandler: %v", err)
		return err
	}

	uploadResult, err := uploadImageToCloudinary(imageHandler, chosenImageURL, writingSession.ID)
	if err != nil {
		log.Printf("Error uploading image to Cloudinary: %v", err)
		return err
	}
	anky.ImageURL = uploadResult.SecureURL

	log.Printf("Image uploaded to Cloudinary successfully. Public ID: %s, URL: %s", uploadResult.PublicID, uploadResult.SecureURL)

	anky.Status = "image_uploaded"
	s.store.UpdateAnkyStatus(anky)

	if err != nil {
		// TODO: handle processing error
		// s.handleAnkyProcessingError(anky, "image_generation_failed", err)
		return err
	}

	// 5. Mark as complete
	anky.Status = "casting_to_farcaster"
	s.store.UpdateAnkyStatus(anky)

	castResponse, err := publishToFarcaster(writingSession)
	if err != nil {
		log.Printf("Error publishing to Farcaster: %v", err)
		return err
	}

	anky.CastHash = castResponse.Hash

	anky.Status = "completed"
	s.store.UpdateAnkyStatus(anky)
	s.store.UpdateAnky(anky)

	// 6. Optionally, broadcast completion event
	// s.broadcastAnkyCompletion(anky)

	return nil
}

func (s *APIServer) generateAnkyReflection(session *models.WritingSession) (map[string]string, error) {
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

func uploadImageToCloudinary(imageHandler *handlers.ImageHandler, imageURL, sessionID string) (*uploader.UploadResult, error) {
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

func publishToFarcaster(session *models.WritingSession) (*models.Cast, error) {
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
