package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ankylat/anky/server/services"
	"github.com/ankylat/anky/server/storage"
	"github.com/ankylat/anky/server/types"
	"github.com/ankylat/anky/server/utils"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
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
}

func NewAPIServer(listenAddr string, store *storage.PostgresStore) (*APIServer, error) {
	return &APIServer{
		listenAddr: listenAddr,
		store:      store,
	}, nil
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

	// Badge routes
	router.HandleFunc("/users/{userId}/badges", makeHTTPHandleFunc(s.handleGetUserBadges)).Methods("GET")

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

	if writingSession.IsAnky && writingSession.TimeSpent != nil && *writingSession.TimeSpent >= 480 {
		bgCtx := context.Background()

		fmt.Println("Initiating Anky creation process...")

		anky := types.NewAnky(writingSession.ID, writingSession.Prompt, writingSession.UserID)
		fmt.Printf("Created new Anky object: %+v\n", anky)

		if err := s.store.CreateAnky(ctx, anky); err != nil {
			http.Error(w, fmt.Sprintf("Error creating initial anky record: %v", err), http.StatusInternalServerError)
			return nil
		}
		fmt.Println("Initial Anky record created in database.")

		ankyService, err := services.NewAnkyService(s.store)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating anky service: %v", err), http.StatusInternalServerError)
			return nil
		}
		fmt.Println("Anky service created successfully.")

		errChan := make(chan error, 1)
		go func() {
			defer close(errChan)
			if err := ankyService.ProcessAnkyCreation(bgCtx, anky, writingSession); err != nil {
				log.Printf("Error processing Anky creation: %v", err)
				anky.Status = "failed"
				if updateErr := s.store.UpdateAnky(bgCtx, anky); updateErr != nil {
					log.Printf("Error updating Anky status: %v", updateErr)
				}
				errChan <- err
			}
		}()

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
