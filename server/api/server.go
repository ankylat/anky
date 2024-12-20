package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ankylat/anky/server/services"
	"github.com/ankylat/anky/server/storage"
	"github.com/ankylat/anky/server/types"
	"github.com/ankylat/anky/server/utils"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
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
	store      *storage.PostgresStore
	hub        *Hub
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Be careful with this in production
	},
}

type WritingMessage struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	UserID  string `json:"userId"`
}

// Add WebSocket message types
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Add WebSocket client structure
type Client struct {
	conn *websocket.Conn
	send chan []byte
}

// Add WebSocket hub to manage connections
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func NewAPIServer(listenAddr string, store *storage.PostgresStore) (*APIServer, error) {
	return &APIServer{
		listenAddr: listenAddr,
		store:      store,
		hub:        newHub(),
	}, nil
}

func (s *APIServer) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}

	client := &Client{
		conn: conn,
		send: make(chan []byte, 256),
	}
	s.hub.register <- client

	// Start goroutines for reading and writing
	go client.writePump(s.hub)
	go client.readPump(s.hub, s)
}

func (c *Client) writePump(hub *Hub) {
	defer func() {
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}
		}
	}
}

func (s *APIServer) handleWSMessage(msg WSMessage) (*WSMessage, error) {
	switch msg.Type {
	case "writing":
		// Handle writing message
		return &WSMessage{
			Type:    "writing_response",
			Payload: msg.Payload,
		}, nil
	default:
		return nil, fmt.Errorf("unknown message type: %s", msg.Type)
	}
}

func (c *Client) readPump(hub *Hub, s *APIServer) {
	defer func() {
		hub.unregister <- c
		c.conn.Close()
	}()

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		// Handle incoming message
		var wsMessage WSMessage
		if err := json.Unmarshal(message, &wsMessage); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		// Handle different message types
		response, err := s.handleWSMessage(wsMessage)
		if err != nil {
			log.Printf("Error handling message: %v", err)
			errorResponse := WSMessage{
				Type: "error",
				Payload: map[string]string{
					"error": err.Error(),
				},
			}
			responseBytes, _ := json.Marshal(errorResponse)
			c.send <- responseBytes
			continue
		}

		// Send response back to client
		responseBytes, _ := json.Marshal(response)
		c.send <- responseBytes
	}
}

func (s *APIServer) Run() error {
	router := mux.NewRouter()

	router.HandleFunc("/", makeHTTPHandleFunc(s.handleHelloWorld))
	// User routes
	router.HandleFunc("/users/register-anon-user", makeHTTPHandleFunc(s.handleRegisterAnonymousUser)).Methods("POST")
	router.HandleFunc("/users", makeHTTPHandleFunc(s.handleGetUsers)).Methods("GET")
	router.HandleFunc("/users/{userId}", makeHTTPHandleFunc(s.handleGetUserByID)).Methods("GET")
	router.HandleFunc("/users/{userId}", makeHTTPHandleFunc(s.handleUpdateUser)).Methods("PUT")
	router.HandleFunc("/users/{userId}", makeHTTPHandleFunc(s.handleDeleteUser)).Methods("DELETE")
	router.HandleFunc("/users/create-profile/{userId}", makeHTTPHandleFunc(s.handleCreateUserProfile)).Methods("POST")

	// Privy user routes
	router.HandleFunc("/privy-users/${id}", makeHTTPHandleFunc(s.handleCreatePrivyUser)).Methods("POST")

	// Writing session routes
	router.HandleFunc("/writing-session-started", makeHTTPHandleFunc(s.handleWritingSessionStarted)).Methods("POST")
	router.HandleFunc("/writing-session-ended", makeHTTPHandleFunc(s.handleWritingSessionEnded)).Methods("POST")
	router.HandleFunc("/writing-sessions/{id}", makeHTTPHandleFunc(s.handleGetWritingSession)).Methods("GET")
	router.HandleFunc("/users/{userId}/writing-sessions", makeHTTPHandleFunc(s.handleGetUserWritingSessions)).Methods("GET")

	// Anky routes
	router.HandleFunc("/ankys", makeHTTPHandleFunc(s.handleGetAnkys)).Methods("GET")
	router.HandleFunc("/ankys/{id}", makeHTTPHandleFunc(s.handleGetAnkyByID)).Methods("GET")
	router.HandleFunc("/users/{userId}/ankys", makeHTTPHandleFunc(s.handleGetAnkysByUserID)).Methods("GET")
	router.HandleFunc("/anky/onboarding/{userId}", makeHTTPHandleFunc(s.handleProcessUserOnboarding)).Methods("POST")
	router.HandleFunc("/anky/edit-cast", makeHTTPHandleFunc(s.handleEditCast)).Methods("POST")
	router.HandleFunc("/anky/simple-prompt", makeHTTPHandleFunc(s.handleSimplePrompt)).Methods("POST")
	router.HandleFunc("/anky/messages-prompt", makeHTTPHandleFunc(s.handleMessagesPrompt)).Methods("POST")
	router.HandleFunc("/anky/raw-writing-session", makeHTTPHandleFunc(s.handleRawWritingSession)).Methods("POST")

	// newen routes
	router.HandleFunc("/newen/transactions/{userId}", makeHTTPHandleFunc(s.handleGetUserTransactions)).Methods("GET")

	// Badge routes
	router.HandleFunc("/users/{userId}/badges", makeHTTPHandleFunc(s.handleGetUserBadges)).Methods("GET")

	// WebSocket routes
	router.HandleFunc("/ws/writing", s.handleWebSocket)

	log.Println("Server running on port:", s.listenAddr)
	return http.ListenAndServe(s.listenAddr, router)
}

func (s *APIServer) handleHelloWorld(w http.ResponseWriter, r *http.Request) error {
	return WriteJSON(w, http.StatusOK, map[string]string{"message": "Hello, World!"})
}

// POST /users/register-anon-user
func (s *APIServer) handleRegisterAnonymousUser(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	log.Println("Handling register anonymous user request")

	newUser := new(types.CreateNewUserRequest)
	if err := json.NewDecoder(r.Body).Decode(newUser); err != nil {
		log.Printf("Error decoding request body: %v", err)
		return err
	}
	log.Printf("Received request to create user: %+v", newUser)

	if newUser.UserMetadata == nil {
		newUser.UserMetadata = &types.UserMetadata{}
	}

	log.Printf("user metadata is: %+v", newUser.UserMetadata)

	user := types.NewUser(newUser.ID, newUser.IsAnonymous, time.Now().UTC(), newUser.UserMetadata)

	log.Printf("Created new user object with wallet address: %s", user.WalletAddress)

	tokenString, err := utils.CreateJWT(user)
	if err != nil {
		log.Printf("Error creating JWT: %v", err)
		return err
	}
	user.JWT = tokenString
	log.Println("Generated JWT token for user")

	if err := s.store.CreateUser(ctx, user); err != nil {
		log.Printf("Error storing user in database: %v", err)
		return err
	}
	log.Printf("Successfully stored user with ID %s in database", user.ID)

	log.Println("Sending successful response")
	return WriteJSON(w, http.StatusOK, map[string]interface{}{
		"user": user,
		"jwt":  tokenString,
	})
}

// GET /users
func (s *APIServer) handleGetUsers(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	// Get pagination parameters from query string, default to limit=20, offset=0
	limit := 20
	offset := 0
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	accounts, err := s.store.GetUsers(ctx, limit, offset)
	if err != nil {
		return err
	}
	return WriteJSON(w, http.StatusOK, accounts)
}

// GET /users/{id}
func (s *APIServer) handleGetUserByID(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id, err := utils.GetUserID(r)
	if err != nil {
		return err
	}
	user, err := s.store.GetUserByID(ctx, id)
	if err != nil {
		return err
	}
	return WriteJSON(w, http.StatusOK, user)
}

// PUT /users/{id}
func (s *APIServer) handleUpdateUser(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	id, err := utils.GetUserID(r)
	if err != nil {
		return err
	}
	updateUserRequest := new(types.UpdateUserRequest)
	if err := json.NewDecoder(r.Body).Decode(updateUserRequest); err != nil {
		return err
	}
	err = s.store.UpdateUser(ctx, id, updateUserRequest.User)
	if err != nil {
		return err
	}
	return WriteJSON(w, http.StatusOK, map[string]int{"updated": 1})
}

// DELETE /users/{id}
func (s *APIServer) handleDeleteUser(w http.ResponseWriter, r *http.Request) error {
	// TODO ::::: IMPLEMENT JWT FOR VERIFICATION THAT THE USER IS THE OWNER OF THE ACCOUNT THAT IS BEING DELETED
	ctx := r.Context()
	id, err := utils.GetUserID(r)
	if err != nil {
		return err
	}

	// Get authenticated user ID from context
	authenticatedUserID, ok := ctx.Value("userID").(uuid.UUID)
	if !ok {
		return fmt.Errorf("unauthorized: no user ID in context")
	}

	// Check if authenticated user matches requested user ID
	if authenticatedUserID != id {
		return fmt.Errorf("unauthorized: cannot delete other users")
	}

	return s.store.DeleteUser(ctx, id)
}

func (s *APIServer) handleCreateUserProfile(w http.ResponseWriter, r *http.Request) error {
	fmt.Println("Starting handleCreateUserProfile...")
	ctx := r.Context()

	fmt.Println("Attempting to get user ID from request...")
	userID, err := utils.GetUserID(r)
	if err != nil {
		fmt.Printf("Error getting user ID: %v\n", err)
		return err
	}
	fmt.Printf("User ID obtained: %s\n", userID)

	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		fmt.Printf("Error creating anky service: %v\n", err)
		return fmt.Errorf("error creating anky service: %v", err)
	}
	fmt.Println("Anky service created successfully")

	fmt.Println("Processing onboarding conversation...")
	response, err := ankyService.CreateUserProfile(ctx, userID)
	if err != nil {
		fmt.Printf("Error processing onboarding conversation: %v\n", err)
		return fmt.Errorf("error processing onboarding conversation: %v", err)
	}
	fmt.Printf("Onboarding conversation processed successfully, response: %s\n", response)

	fmt.Println("Sending response...")
	return WriteJSON(w, http.StatusOK, map[string]string{
		"123": "123",
	})

}

func (s *APIServer) handleGetUserTransactions(w http.ResponseWriter, r *http.Request) error {
	// Extract user ID and wallet address from URL params
	vars := mux.Vars(r)
	userID := vars["userId"]

	if userID == "" {
		return fmt.Errorf("missing required parameters: userId and walletAddress")
	}

	// Create newen service
	newenService, err := services.NewNewenService(s.store)
	if err != nil {
		return fmt.Errorf("error creating newen service: %v", err)
	}

	// Process transaction
	transactions, err := newenService.GetUserTransactions(userID)
	if err != nil {
		return fmt.Errorf("error processing transaction: %v", err)
	}

	return WriteJSON(w, http.StatusOK, transactions)
}

// ***************** PRIVY ROUTES *****************

func (s *APIServer) handleCreatePrivyUser(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	// 1. Verify authentication token from request header
	userId, err := utils.GetUserID(r)
	if err != nil {
		return err
	}
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return fmt.Errorf("no authorization header provided")
	}

	// Extract Bearer token
	tokenParts := strings.Split(authHeader, " ")
	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
		return fmt.Errorf("invalid authorization header format")
	}
	token := tokenParts[1]

	// 2. Validate the token and get user claims
	_, err = utils.ValidateJWT(token)
	if err != nil {
		return fmt.Errorf("invalid token: %v", err)
	}

	// 3. Decode the request body
	newPrivyUserRequest := new(types.CreatePrivyUserRequest)
	if err := json.NewDecoder(r.Body).Decode(newPrivyUserRequest); err != nil {
		return fmt.Errorf("invalid request body: %v", err)
	}

	// 4. Create new PrivyUser with associated user ID
	privyUser := &types.PrivyUser{
		DID:            newPrivyUserRequest.PrivyUser.DID,
		UserID:         userId, // Link to the authenticated user
		CreatedAt:      time.Now().UTC(),
		LinkedAccounts: newPrivyUserRequest.PrivyUser.LinkedAccounts,
	}

	// 5. Store the PrivyUser in database
	if err := s.store.CreatePrivyUser(ctx, privyUser); err != nil {
		return fmt.Errorf("failed to create privy user: %v", err)
	}

	return WriteJSON(w, http.StatusCreated, privyUser)
}

// ***************** WRITING SESSION ROUTES *****************

// POST /writing-session-started
func (s *APIServer) handleWritingSessionStarted(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	fmt.Println("Handling writing session started request...")
	fmt.Println("Parsing request body...")

	newWritingSessionRequest := new(types.CreateWritingSessionRequest)
	if err := json.NewDecoder(r.Body).Decode(newWritingSessionRequest); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		return err
	}
	fmt.Printf("Decoded writing session request: %+v\n", newWritingSessionRequest)

	// Parse session ID
	fmt.Printf("Attempting to parse session ID: %s\n", newWritingSessionRequest.SessionID)
	sessionUUID, err := uuid.Parse(newWritingSessionRequest.SessionID)
	if err != nil {
		fmt.Printf("Failed to parse session ID: %v\n", err)
		return fmt.Errorf("invalid session ID: %v", err)
	}
	fmt.Printf("Successfully parsed session ID to UUID: %s\n", sessionUUID)

	// Handle anonymous users with a default UUID
	fmt.Printf("Processing user ID: %s\n", newWritingSessionRequest.UserID)
	var userUUID uuid.UUID
	if newWritingSessionRequest.UserID == "anonymous" {
		fmt.Println("Anonymous user detected, using default UUID")
		// Use a specific UUID for anonymous users
		userUUID = uuid.MustParse("00000000-0000-0000-0000-000000000000") // Anonymous user UUID
	} else {
		fmt.Println("Parsing non-anonymous user ID")
		userUUID, err = uuid.Parse(newWritingSessionRequest.UserID)
		if err != nil {
			fmt.Printf("Failed to parse user ID: %v\n", err)
			return fmt.Errorf("invalid user ID: %v", err)
		}
	}
	fmt.Printf("Final user UUID: %s\n", userUUID)

	// Get last session for user to determine next index
	fmt.Printf("Fetching previous sessions for user %s\n", userUUID)
	userSessions, err := s.store.GetUserWritingSessions(ctx, userUUID, false, 1, 0)
	if err != nil {
		fmt.Printf("Error getting user's last session: %v\n", err)
		return err
	}
	fmt.Printf("Found %d previous sessions\n", len(userSessions))

	sessionIndex := 0
	if len(userSessions) > 0 {
		sessionIndex = userSessions[0].SessionIndexForUser + 1
	}
	fmt.Printf("New session will have index: %d\n", sessionIndex)

	fmt.Println("Creating new writing session object...")
	writingSession := types.NewWritingSession(sessionUUID, userUUID, newWritingSessionRequest.Prompt, sessionIndex, newWritingSessionRequest.IsOnboarding)
	fmt.Printf("Created new writing session: %+v\n", writingSession)

	fmt.Println("Attempting to save writing session to database...")
	if err := s.store.CreateWritingSession(ctx, writingSession); err != nil {
		fmt.Printf("Error creating writing session: %v\n", err)
		return err
	}
	fmt.Printf("Successfully created writing session %s in database\n", writingSession.ID)

	fmt.Println("Preparing response...")
	fmt.Printf("Returning writing session: %+v\n", writingSession)

	return WriteJSON(w, http.StatusOK, writingSession)
}

// Start of Selection
// POST /writing-session-ended
func (s *APIServer) handleWritingSessionEnded(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	fmt.Println("Handling writing session ended request...")

	newWritingSessionEndRequest := new(types.CreateWritingSessionEndRequest)
	if err := json.NewDecoder(r.Body).Decode(newWritingSessionEndRequest); err != nil {
		http.Error(w, fmt.Sprintf("Error decoding request body: %v", err), http.StatusBadRequest)
		return nil
	}
	fmt.Printf("Decoded writing session end request: %+v\n", newWritingSessionEndRequest)

	fmt.Printf("Looking up writing session with ID: %s\n", newWritingSessionEndRequest.SessionID)
	writingSession, err := s.store.GetWritingSessionById(ctx, newWritingSessionEndRequest.SessionID)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error getting writing session: %v", err), http.StatusInternalServerError)
		return nil
	}

	fmt.Println("Updating writing session fields...")
	writingSession.EndingTimestamp = &newWritingSessionEndRequest.EndingTimestamp
	writingSession.WordsWritten = newWritingSessionEndRequest.WordsWritten
	writingSession.NewenEarned = newWritingSessionEndRequest.NewenEarned
	writingSession.TimeSpent = &newWritingSessionEndRequest.TimeSpent
	writingSession.IsAnky = newWritingSessionEndRequest.IsAnky
	writingSession.Writing = newWritingSessionEndRequest.Text

	fmt.Printf("Parsed ParentAnkyID: %s\n", newWritingSessionEndRequest.ParentAnkyID)
	if newWritingSessionEndRequest.ParentAnkyID != "" {
		parentAnkyID, err := uuid.Parse(newWritingSessionEndRequest.ParentAnkyID)
		if err != nil {
			http.Error(w, fmt.Sprintf("Invalid ParentAnkyID: %v", err), http.StatusBadRequest)
			return err
		}
		writingSession.ParentAnkyID = &parentAnkyID
	}

	writingSession.AnkyResponse = &newWritingSessionEndRequest.AnkyResponse
	writingSession.Status = newWritingSessionEndRequest.Status

	fmt.Printf("Writing session fields updated: %+v\n", writingSession)

	if writingSession.IsAnky {
		bgCtx := context.Background()

		fmt.Println("Initiating Anky creation process...")

		// Validate UUIDs before creating Anky
		if writingSession.ID == uuid.Nil {
			return fmt.Errorf("writing session ID is nil")
		}
		if writingSession.UserID == uuid.Nil {
			return fmt.Errorf("user ID is nil")
		}

		anky := types.NewAnky(writingSession.ID, writingSession.Prompt, writingSession.UserID)

		// Additional validation
		if anky.ID == uuid.Nil {
			return fmt.Errorf("generated anky ID is nil")
		}

		log.Printf("Creating Anky - ID: %s, UserID: %s, WritingSessionID: %s",
			anky.ID, anky.UserID, anky.WritingSessionID)

		if err := s.store.CreateAnky(ctx, anky); err != nil {
			log.Printf("Error creating initial anky record: %v", err)
			return fmt.Errorf("failed to create anky record: %v", err)
		}
		fmt.Println("Initial Anky record created in database.")

		ankyService, err := services.NewAnkyService(s.store)
		if err != nil {
			log.Printf("Error creating anky service: %v", err)
			return fmt.Errorf("failed to create anky service: %v", err)
		}
		fmt.Println("Anky service created successfully.")

		// Create error channel with buffer
		errChan := make(chan error, 1)
		doneChan := make(chan bool, 1)

		go func() {
			defer close(errChan)
			defer close(doneChan)

			log.Printf("Starting ProcessAnkyCreation for Anky ID: %s", anky.ID)
			if err := ankyService.ProcessAnkyCreation(bgCtx, anky, writingSession); err != nil {
				log.Printf("Error processing Anky creation: %v", err)
				anky.Status = "failed"
				if updateErr := s.store.UpdateAnky(bgCtx, anky); updateErr != nil {
					log.Printf("Error updating Anky status: %v", updateErr)
				}
				errChan <- err
				return
			}
			log.Printf("Successfully completed ProcessAnkyCreation for Anky ID: %s", anky.ID)
			doneChan <- true
		}()

		// Set a timeout for the goroutine
		select {
		case err := <-errChan:
			if err != nil {
				log.Printf("Received error from ProcessAnkyCreation: %v", err)
				// Continue execution despite error, as this is async
			}
		case <-time.After(2 * time.Second): // Adjust timeout as needed
			log.Println("ProcessAnkyCreation started successfully in background")
		}

		writingSession.AnkyID = &anky.ID
		fmt.Printf("Anky ID set in writing session: %s\n", anky.ID)
	}

	fmt.Printf("Saving writing session with updated status: %s\n", writingSession.Status)
	if err := s.store.UpdateWritingSession(ctx, writingSession); err != nil {
		fmt.Printf("Error updating writing session: %v\n", err)
		return nil
	}

	fmt.Println("Writing session successfully updated:")
	fmt.Printf("%+v\n", writingSession)

	return WriteJSON(w, http.StatusOK, writingSession)
}

func (s *APIServer) handleGetWritingSession(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	sessionID, err := getSessionID(r)
	if err != nil {
		return err
	}

	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return fmt.Errorf("invalid session ID format: %v", err)
	}

	session, err := s.store.GetWritingSessionById(ctx, sessionUUID)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, session)
}
func (s *APIServer) handleRawWritingSession(w http.ResponseWriter, r *http.Request) error {
	log.Println("Starting handleRawWritingSession...")
	log.Printf("Request method: %s", r.Method)
	log.Printf("Request headers: %+v", r.Header)

	// Read and decode JSON request
	var requestData struct {
		WritingString string `json:"writingString"`
	}

	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		log.Printf("Error decoding JSON request: %v", err)
		return err
	}
	defer r.Body.Close()

	log.Printf("Raw writing string: %s", requestData.WritingString)

	// Split the writing string into lines
	lines := strings.Split(requestData.WritingString, "\n")
	log.Printf("Number of lines split from writing string: %d", len(lines))

	if len(lines) < 4 {
		log.Printf("Invalid format - insufficient lines. Got %d lines, expected at least 4", len(lines))
		return fmt.Errorf("invalid writing session format: insufficient lines (got %d, need at least 4)", len(lines))
	}

	// Extract metadata from first 4 lines
	userId := strings.TrimSpace(lines[0])
	sessionId := strings.TrimSpace(lines[1])
	prompt := strings.TrimSpace(lines[2])
	startingTimestamp := strings.TrimSpace(lines[3])

	log.Printf("Extracted metadata:")
	log.Printf("- User ID (length: %d): '%s'", len(userId), userId)
	log.Printf("- Session ID (length: %d): '%s'", len(sessionId), sessionId)
	log.Printf("- Prompt (length: %d): '%s'", len(prompt), prompt)
	log.Printf("- Starting Timestamp (length: %d): '%s'", len(startingTimestamp), startingTimestamp)

	// Get writing content (remaining lines)
	writingContent := strings.Join(lines[4:], "\n")
	log.Printf("Writing content length: %d bytes", len(writingContent))
	log.Printf("First 100 chars of writing content: %s", writingContent[:min(100, len(writingContent))])

	// Create data directory structure if it doesn't exist
	userDir := fmt.Sprintf("data/writing_sessions/%s", userId)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		log.Printf("Error creating directory structure: %v", err)
		return err
	}

	// Save individual writing session file
	sessionFilePath := fmt.Sprintf("%s/%s.txt", userDir, sessionId)
	if err := os.WriteFile(sessionFilePath, []byte(requestData.WritingString), 0644); err != nil {
		log.Printf("Error writing session file: %v", err)
		return err
	}

	// Update all_writing_sessions.txt
	allSessionsPath := fmt.Sprintf("%s/all_writing_sessions.txt", userDir)
	f, err := os.OpenFile(allSessionsPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Error opening all_writing_sessions.txt: %v", err)
		return err
	}
	defer f.Close()

	// Add newline before new session ID if file is not empty
	fileInfo, err := f.Stat()
	if err != nil {
		log.Printf("Error getting file info: %v", err)
		return err
	}

	if fileInfo.Size() > 0 {
		if _, err := f.WriteString("\n"); err != nil {
			log.Printf("Error writing newline: %v", err)
			return err
		}
	}

	if _, err := f.WriteString(sessionId); err != nil {
		log.Printf("Error writing session ID: %v", err)
		return err
	}

	response := map[string]interface{}{
		"userId":            userId,
		"sessionId":         sessionId,
		"prompt":            prompt,
		"startingTimestamp": startingTimestamp,
		"writingContent":    writingContent,
	}

	log.Println("Preparing to send response...")
	log.Printf("Response object: %+v", response)

	err = WriteJSON(w, http.StatusOK, response)
	if err != nil {
		log.Printf("Error writing JSON response: %v", err)
		return err
	}

	log.Println("Successfully completed handleRawWritingSession")
	// Get feedback from Anky about the writing session
	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		log.Printf("Error creating AnkyService: %v", err)
		return err
	}

	// Create writing session object for feedback
	writingSession := &types.WritingSession{
		ID:        uuid.MustParse(sessionId),
		UserID:    userId,
		Writing:   writingContent,
		TimeSpent: int(time.Since(startingTimestamp).Seconds()),
	}

	feedback, err := ankyService.OnboardingConversation(ctx, userId, []*types.WritingSession{writingSession}, []string{})
	if err != nil {
		log.Printf("Error getting Anky feedback: %v", err)
		return err
	}

	// Update response with feedback
	response["ankyFeedback"] = feedback

	// Send updated response
	err = WriteJSON(w, http.StatusOK, response)
	if err != nil {
		log.Printf("Error writing JSON response with feedback: %v", err)
		return err
	}

	return nil
}

func (s *APIServer) handleGetUserWritingSessions(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	userID, err := utils.GetUserID(r)
	if err != nil {
		return err
	}

	// Get query parameters with defaults
	limit := 20
	offset := 0
	onlyAnkys := false

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Parse offset
	if offsetStr := r.URL.Query().Get("offset"); offsetStr != "" {
		if parsedOffset, err := strconv.Atoi(offsetStr); err == nil && parsedOffset >= 0 {
			offset = parsedOffset
		}
	}

	// Parse onlyAnkys
	if onlyAnkysStr := r.URL.Query().Get("onlyAnkys"); onlyAnkysStr == "true" {
		onlyAnkys = true
	}

	userSessions, err := s.store.GetUserWritingSessions(ctx, userID, onlyAnkys, limit, offset)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, userSessions)
}

func getSessionID(r *http.Request) (string, error) {
	sessionID := mux.Vars(r)["sessionId"]
	if sessionID == "" {
		return "", fmt.Errorf("no session ID provided")
	}
	return sessionID, nil
}

// ***************** ANKY ROUTES *****************

func (s *APIServer) handleProcessUserOnboarding(w http.ResponseWriter, r *http.Request) error {
	fmt.Println("Starting handleProcessUserOnboarding...")
	ctx := r.Context()

	fmt.Println("Attempting to get user ID from request...")
	userID, err := utils.GetUserID(r)
	if err != nil {
		fmt.Printf("Error getting user ID: %v\n", err)
		return err
	}
	fmt.Printf("User ID obtained: %s\n", userID)

	// Parse request body
	fmt.Println("Decoding request body...")
	var onboardingRequest struct {
		UserWritings    []*types.WritingSession `json:"user_writings"`
		AnkyReflections []string                `json:"anky_responses"`
	}

	if err := json.NewDecoder(r.Body).Decode(&onboardingRequest); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		return fmt.Errorf("error decoding request body: %v", err)
	}
	fmt.Printf("Decoded request body: %+v\n", onboardingRequest)

	// Validate the lengths
	fmt.Println("Validating lengths of user writings and anky reflections...")
	if len(onboardingRequest.UserWritings) != len(onboardingRequest.AnkyReflections)+1 {
		fmt.Println("Invalid number of writings and reflections")
		return fmt.Errorf("invalid number of writings and reflections")
	}
	fmt.Println("Validation successful")

	fmt.Println("Creating Anky service...")
	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		fmt.Printf("Error creating anky service: %v\n", err)
		return fmt.Errorf("error creating anky service: %v", err)
	}
	fmt.Println("Anky service created successfully")

	fmt.Println("Processing onboarding conversation...")
	response, err := ankyService.OnboardingConversation(ctx, userID, onboardingRequest.UserWritings, onboardingRequest.AnkyReflections)
	if err != nil {
		fmt.Printf("Error processing onboarding conversation: %v\n", err)
		return fmt.Errorf("error processing onboarding conversation: %v", err)
	}
	fmt.Printf("Onboarding conversation processed successfully, response: %s\n", response)

	fmt.Println("Sending response...")
	return WriteJSON(w, http.StatusOK, map[string]string{
		"reflection": response,
	})
}

func (s *APIServer) handleGetAnkys(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	// Get query parameters with defaults
	limit := 20
	offset := 0

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	ankys, err := s.store.GetAnkys(ctx, limit, offset)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, ankys)
}

func (s *APIServer) handleGetAnkyByID(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	ankyID, err := utils.GetAnkyID(r)
	if err != nil {
		return err
	}

	anky, err := s.store.GetAnkyByID(ctx, ankyID)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, anky)
}

func (s *APIServer) handleGetAnkysByUserID(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()

	userID, err := utils.GetUserID(r)
	if err != nil {
		return err
	}

	// Get query parameters with defaults
	limit := 20
	offset := 0

	// Parse limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	ankys, err := s.store.GetAnkysByUserID(ctx, userID, limit, offset)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, ankys)
}

func (s *APIServer) handleEditCast(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	var editCastRequest struct {
		Text    string `json:"text"`
		UserFid int    `json:"user_fid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&editCastRequest); err != nil {
		fmt.Printf("Error decoding request body: %v\n", err)
		return fmt.Errorf("error decoding request body: %v", err)
	}
	fmt.Printf("Decoded request body: %+v\n", editCastRequest)

	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		return fmt.Errorf("error creating anky service: %v", err)
	}

	response, err := ankyService.EditCast(ctx, editCastRequest.Text, editCastRequest.UserFid)
	if err != nil {
		return fmt.Errorf("error editing cast: %v", err)
	}

	return WriteJSON(w, http.StatusOK, map[string]string{
		"response": response,
	})
}

func (s *APIServer) handleSimplePrompt(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	var singlePromptRequest struct {
		Prompt string `json:"prompt"`
	}

	if err := json.NewDecoder(r.Body).Decode(&singlePromptRequest); err != nil {
		return fmt.Errorf("error decoding request body: %v", err)
	}
	fmt.Printf("Decoded request body: %+v\n", singlePromptRequest)
	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		return fmt.Errorf("error creating anky service: %v", err)
	}

	response, err := ankyService.SimplePrompt(ctx, singlePromptRequest.Prompt)
	if err != nil {
		return fmt.Errorf("error processing simple prompt: %v", err)
	}

	return WriteJSON(w, http.StatusOK, map[string]string{
		"response": response,
	})
}

func (s *APIServer) handleMessagesPrompt(w http.ResponseWriter, r *http.Request) error {
	var messagesPromptRequest struct {
		Messages []string `json:"messages"`
	}

	if err := json.NewDecoder(r.Body).Decode(&messagesPromptRequest); err != nil {
		return fmt.Errorf("error decoding request body: %v", err)
	}
	fmt.Printf("Decoded request body: %+v\n", messagesPromptRequest)

	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		return fmt.Errorf("error creating anky service: %v", err)
	}

	response, err := ankyService.MessagesPromptRequest(messagesPromptRequest.Messages)
	if err != nil {
		return fmt.Errorf("error processing messages prompt: %v", err)
	}

	return WriteJSON(w, http.StatusOK, map[string]string{
		"response": response,
	})
}

// ******************** BADGE ROUTES ********************

func (s *APIServer) handleGetUserBadges(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	userID, err := utils.GetUserID(r)
	if err != nil {
		return err
	}

	badges, err := s.store.GetUserBadges(ctx, userID)
	if err != nil {
		return err
	}

	return WriteJSON(w, http.StatusOK, badges)
}
