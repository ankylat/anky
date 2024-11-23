package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
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

// Add WebSocket message types

func NewAPIServer(listenAddr string, store *storage.PostgresStore) (*APIServer, error) {
	return &APIServer{
		listenAddr: listenAddr,
		store:      store,
	}, nil
}

func (s *APIServer) Run() error {
	log.Printf("Loaded Privy App ID: %s", os.Getenv("PRIVY_APP_ID"))
	log.Printf("Loaded Privy Public Key length: %d", len(os.Getenv("PRIVY_PUBLIC_KEY")))
	router := mux.NewRouter()

	router.HandleFunc("/", makeHTTPHandleFunc(s.handleHelloWorld))
	// User routes
	router.HandleFunc("/users/register-anon-user", makeHTTPHandleFunc(s.handleRegisterAnonymousUser)).Methods("POST")
	router.HandleFunc("/users", makeHTTPHandleFunc(s.handleGetUsers)).Methods("GET")
	router.HandleFunc("/users/{userId}", makeHTTPHandleFunc(s.handleGetUserByID)).Methods("GET")
	router.HandleFunc("/users/{userId}", makeHTTPHandleFunc(s.handleUpdateUser)).Methods("PUT")
	router.HandleFunc("/users/{userId}", makeHTTPHandleFunc(s.handleDeleteUser)).Methods("DELETE")
	router.HandleFunc("/users/create-profile/{userId}", makeHTTPHandleFunc(s.handleCreateUserProfile)).Methods("POST")
	router.Handle("/user/register-privy-user", PrivyAuth(os.Getenv("PRIVY_APP_ID"), os.Getenv("PRIVY_PUBLIC_KEY"))(makeHTTPHandleFunc(s.handleRegisterPrivyUser))).Methods("POST")

	// Privy user routes
	router.HandleFunc("/privy-users/${id}", makeHTTPHandleFunc(s.handleCreatePrivyUser)).Methods("POST")

	// Writing session routes
	router.HandleFunc("/writing-session-started", makeHTTPHandleFunc(s.handleWritingSessionStarted)).Methods("POST")
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

	router.HandleFunc("/anky/process-writing-conversation", makeHTTPHandleFunc(s.handleProcessWritingConversation)).Methods("POST")
	router.HandleFunc("/anky/finished-anky-registration", makeHTTPHandleFunc(s.handleFinishedAnkyRegistration)).Methods("POST")

	router.Handle("/farcaster/get-new-fid", PrivyAuth(os.Getenv("PRIVY_APP_ID"), os.Getenv("PRIVY_PUBLIC_KEY"))(makeHTTPHandleFunc(s.handleGetNewFID))).Methods("POST")
	router.Handle("/farcaster/register-new-fid", PrivyAuth(os.Getenv("PRIVY_APP_ID"), os.Getenv("PRIVY_PUBLIC_KEY"))(makeHTTPHandleFunc(s.handleRegisterNewFID))).Methods("POST")
	// newen routes
	router.HandleFunc("/newen/transactions/{userId}", makeHTTPHandleFunc(s.handleGetUserTransactions)).Methods("GET")

	// Badge routes
	router.HandleFunc("/users/{userId}/badges", makeHTTPHandleFunc(s.handleGetUserBadges)).Methods("GET")

	// WebSocket routes: TODO

	log.Println("Server running on port:", s.listenAddr)
	return http.ListenAndServe(s.listenAddr, router)
}

func (s *APIServer) handleRegisterNewFID(w http.ResponseWriter, r *http.Request) error {
	log.Println("=== Starting handleRegisterNewFID endpoint ===")

	var req struct {
		Deadline  int       `json:"deadline"`
		Address   string    `json:"address"`
		FID       int       `json:"fid"`
		Signature string    `json:"signature"`
		UserID    uuid.UUID `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Failed to decode request body: %v", err)
		return fmt.Errorf("error decoding request body: %w", err)
	}

	log.Printf("📥 Received request to register new FID with params: %+v", req)

	pendingAnkys, err := s.store.GetAnkysByUserIDAndStatus(r.Context(), req.UserID, "pending_to_cast")
	if err != nil {
		log.Printf("❌ Failed to get pending ankys: %v", err)
		return fmt.Errorf("error getting pending ankys: %w", err)
	}

	// Prepare request to Neynar API
	neynarReq := struct {
		Signature                   string `json:"signature"`
		FID                         int    `json:"fid"`
		RequestedUserCustodyAddress string `json:"requested_user_custody_address"`
		Deadline                    int    `json:"deadline"`
		Fname                       string `json:"fname"`
	}{
		Signature:                   req.Signature,
		FID:                         req.FID,
		RequestedUserCustodyAddress: req.Address,
		Deadline:                    req.Deadline,
		Fname:                       pendingAnkys[0].TokenName,
	}

	jsonData, err := json.Marshal(neynarReq)
	if err != nil {
		log.Printf("❌ Failed to marshal Neynar request data: %v", err)
		return fmt.Errorf("error marshaling neynar request: %w", err)
	}

	log.Printf("🔄 Preparing Neynar API request with data: %+v", neynarReq)

	// Call Neynar API
	client := &http.Client{}
	neynarResp, err := http.NewRequest("POST", "https://api.neynar.com/v2/farcaster/user", bytes.NewBuffer(jsonData))
	if err != nil {
		log.Printf("❌ Failed to create Neynar API request: %v", err)
		return fmt.Errorf("error creating neynar request: %w", err)
	}

	log.Println("🔑 Adding headers to Neynar request...")
	neynarResp.Header.Add("accept", "application/json")
	neynarResp.Header.Add("content-type", "application/json")
	neynarResp.Header.Add("x-api-key", os.Getenv("NEYNAR_API_KEY"))

	log.Println("📡 Sending request to Neynar API...")
	resp, err := client.Do(neynarResp)
	if err != nil {
		log.Printf("❌ Failed to call Neynar API: %v", err)
		return fmt.Errorf("error calling neynar API: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Signer  struct {
			SignerUUID string `json:"signer_uuid"`
			FID        int    `json:"fid"`
		} `json:"signer"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		log.Printf("❌ Failed to decode Neynar API response: %v", err)
		return fmt.Errorf("error decoding neynar response: %w", err)
	}

	if !result.Success {
		log.Println("❌ Neynar API call was not successful")
		return fmt.Errorf("neynar API call was not successful")
	}

	log.Printf("✅ Successfully received response from Neynar API: %+v", result)

	// Update user with new Farcaster data
	log.Printf("🔄 Fetching user with ID: %s", req.UserID)
	user, err := s.store.GetUserByID(r.Context(), req.UserID)
	if err != nil {
		log.Printf("❌ Failed to get user: %v", err)
		return fmt.Errorf("error getting user: %w", err)
	}

	log.Println("🔄 Updating user's Farcaster data...")
	if user.FarcasterUser == nil {
		log.Println("📝 Creating new FarcasterUser object for user")
		user.FarcasterUser = &types.FarcasterUser{}
	}
	user.FarcasterUser.SignerUUID = result.Signer.SignerUUID
	user.FarcasterUser.FID = result.Signer.FID
	user.FarcasterUser.CustodyAddress = req.Address
	user.FID = result.Signer.FID

	log.Println("💾 Saving updated user data to database...")
	if err := s.store.UpdateUser(r.Context(), req.UserID, user); err != nil {
		log.Printf("❌ Failed to update user: %v", err)
		return fmt.Errorf("error updating user: %w", err)
	}

	log.Printf("✅ Successfully updated user with new Farcaster data: %+v", user)

	log.Println("🚀 Launching goroutine to publish first Anky to Farcaster...")
	go services.NewFarcasterService().PublishFirstUserAnkyToFarcaster(req.UserID)

	log.Println("✅ Registration complete - sending success response")
	return WriteJSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (s *APIServer) handleGetNewFID(w http.ResponseWriter, r *http.Request) error {
	log.Println("=== Starting handleGetNewFID endpoint ===")

	// Check total number of FIDs
	numberOfFids, err := s.store.CountNumberOfFids(context.Background())
	if err != nil {
		log.Printf("❌ Failed to count total FIDs in database. Error: %v", err)
		return fmt.Errorf("error counting FIDs: %w", err)
	}
	log.Printf("📊 Current total number of FIDs: %d", numberOfFids)

	// Check if we've hit the 504 FID limit
	if numberOfFids == 504 {
		log.Println("🛑 Cannot create new FID - reached maximum limit of 504")
		return WriteJSON(w, http.StatusBadRequest, map[string]string{
			"error": "the fifth season of anky is complete",
		})
	}

	// Parse the incoming request
	var req struct {
		UserWalletAddress string    `json:"user_wallet_address"`
		UserID            uuid.UUID `json:"user_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("❌ Failed to parse request body. Error: %v", err)
		return fmt.Errorf("error decoding request body: %w", err)
	}
	log.Printf("👉 Processing request for wallet address: %s", req.UserWalletAddress)
	log.Printf("👉 Processing request for user ID: %s", req.UserID)

	pendingAnkys, err := s.store.GetAnkysByUserIDAndStatus(r.Context(), req.UserID, "pending_to_cast")
	if err != nil {
		log.Printf("❌ Failed to get pending ankys: %v", err)
		return fmt.Errorf("error getting pending ankys: %w", err)
	}

	if len(pendingAnkys) == 0 {
		log.Println("❌ No pending Ankys found for user - cannot proceed with FID registration")
		return WriteJSON(w, http.StatusBadRequest, map[string]string{
			"error": "You need to write your first Anky (8 minutes of writing) before getting a Farcaster ID",
		})
	}
	log.Printf("✅ Found %d pending Ankys for user", len(pendingAnkys))

	// Set up Neynar API call
	client := &http.Client{}
	neynarReq, err := http.NewRequest("GET", "https://api.neynar.com/v2/farcaster/user/fid", nil)
	if err != nil {
		log.Printf("❌ Failed to create Neynar API request. Error: %v", err)
		return fmt.Errorf("error creating Neynar request: %w", err)
	}
	log.Println("🔄 Making request to Neynar API to get new FID...")

	neynarReq.Header.Add("api_key", os.Getenv("NEYNAR_API_KEY"))

	resp, err := client.Do(neynarReq)
	if err != nil {
		log.Printf("❌ Neynar API call failed. Error: %v", err)
		return fmt.Errorf("error calling Neynar API: %w", err)
	}
	defer resp.Body.Close()

	var neynarResp struct {
		FID int `json:"fid"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&neynarResp); err != nil {
		log.Printf("❌ Failed to parse Neynar API response. Error: %v", err)
		return fmt.Errorf("error decoding Neynar response: %w", err)
	}
	log.Printf("✅ Successfully received new FID from Neynar: %d", neynarResp.FID)

	// Calculate expiration deadline (1 hour from now)
	deadline := time.Now().Unix() + 3600
	log.Printf("⏰ Setting deadline for FID registration: %d (1 hour from now)", deadline)

	// Get nonce (placeholder)
	nonce := 0 // TODO: Implement actual contract nonce retrieval
	log.Printf("🔢 Using nonce value: %d", nonce)

	// Prepare response
	response := map[string]string{
		"new_fid":        fmt.Sprintf("%d", neynarResp.FID),
		"deadline":       fmt.Sprintf("%d", deadline),
		"nonce":          fmt.Sprintf("%d", nonce),
		"address":        req.UserWalletAddress,
		"number_of_fids": fmt.Sprintf("%d", numberOfFids),
	}

	log.Printf("✨ Sending final response to client: %+v", response)
	return WriteJSON(w, http.StatusOK, response)
}

func (s *APIServer) handleRegisterPrivyUser(w http.ResponseWriter, r *http.Request) error {
	log.Println("[RegisterPrivyUser] Starting registration process")

	type RequestPrivyUser struct {
		ID               string                `json:"id"`
		CreatedAt        int64                 `json:"created_at"`
		LinkedAccounts   []types.LinkedAccount `json:"linked_accounts"`
		HasAcceptedTerms bool                  `json:"has_accepted_terms"`
		IsGuest          bool                  `json:"is_guest"`
		UserID           string                `json:"user_id"`
	}

	var req struct {
		User     *RequestPrivyUser `json:"user"`
		AnkyUser struct {
			ID            string              `json:"id"`
			Settings      interface{}         `json:"settings"`
			WalletAddress string              `json:"wallet_address"`
			CreatedAt     string              `json:"created_at"`
			Metadata      *types.UserMetadata `json:"metadata"`
		} `json:"ankyUser"`
	}

	bodyBytes, _ := io.ReadAll(r.Body)
	log.Printf("[RegisterPrivyUser] Raw request body: %s", string(bodyBytes))
	r.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("[RegisterPrivyUser] Error parsing JSON: %v", err)
		return err
	}
	log.Printf("[RegisterPrivyUser] Decoded request: %+v", req)

	if req.User == nil {
		log.Println("[RegisterPrivyUser] Missing user data in request")
		return fmt.Errorf("missing user data")
	}
	log.Printf("[RegisterPrivyUser] Processing user with ID: %s", req.User.UserID)

	userUUID, err := uuid.Parse(req.User.UserID)
	if err != nil {
		log.Printf("[RegisterPrivyUser] Error parsing UUID from %s: %v", req.User.UserID, err)
		return err
	}
	log.Printf("[RegisterPrivyUser] Parsed UUID: %s", userUUID)

	createdAt := time.Unix(req.User.CreatedAt, 0)
	log.Printf("[RegisterPrivyUser] User creation time: %v", createdAt)

	log.Printf("[RegisterPrivyUser] Fetching existing user with ID: %s", userUUID)
	user, err := s.store.GetUserByID(r.Context(), userUUID)
	if err != nil {
		log.Printf("[RegisterPrivyUser] Error fetching user: %v", err)
		return err
	}
	log.Printf("[RegisterPrivyUser] Found existing user: %+v", user)

	user.PrivyUser = &types.PrivyUser{
		DID:              req.User.ID,
		UserID:           userUUID,
		CreatedAt:        createdAt,
		LinkedAccounts:   req.User.LinkedAccounts,
		HasAcceptedTerms: req.User.HasAcceptedTerms,
		IsGuest:          req.User.IsGuest,
	}
	user.PrivyDID = req.User.ID
	log.Printf("[RegisterPrivyUser] Updated user with Privy details: %+v", user.PrivyUser)

	if err := s.store.UpdateUser(r.Context(), userUUID, user); err != nil {
		log.Printf("[RegisterPrivyUser] Error updating user: %v", err)
		return err
	}
	log.Println("[RegisterPrivyUser] Successfully updated user in database")

	return WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Successfully registered Privy user",
	})
}

func (s *APIServer) handleFinishedAnkyRegistration(w http.ResponseWriter, r *http.Request) error {
	// Parse request body
	var req struct {
		UserID     uuid.UUID `json:"user_id"`
		SignerUUID string    `json:"signer_uuid"`
		FID        int       `json:"fid"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return fmt.Errorf("error decoding request body: %v", err)
	}

	// Get existing user
	user, err := s.store.GetUserByID(r.Context(), req.UserID)
	if err != nil {
		return fmt.Errorf("error getting user: %v", err)
	}

	// Update user with new farcaster properties
	user.FarcasterUser = &types.FarcasterUser{
		SignerUUID: req.SignerUUID,
	}
	user.FID = req.FID

	// Update user in database
	if err := s.store.UpdateUser(r.Context(), req.UserID, user); err != nil {
		return fmt.Errorf("error updating user: %v", err)
	}

	return WriteJSON(w, http.StatusOK, map[string]string{
		"message": "Successfully updated user with farcaster details",
	})
}

func (s *APIServer) handleProcessWritingConversation(w http.ResponseWriter, r *http.Request) error {
	ctx := r.Context()
	log.Println("Starting handleProcessWritingConversation...")

	// Define request structure
	type RequestBody struct {
		ConversationSoFar []string `json:"conversation_so_far"`
	}

	// Parse request body
	var req RequestBody
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding request body: %v", err)
		return err
	}
	log.Printf("Received %d messages to process", len(req.ConversationSoFar))
	// Print the conversation so far for debugging
	log.Printf("Conversation so far: %+v", req.ConversationSoFar)
	for i, msg := range req.ConversationSoFar {
		log.Printf("Message %d: %s", i, msg)
	}

	// Check the last writing session
	if len(req.ConversationSoFar) > 0 {
		lastMsg := req.ConversationSoFar[len(req.ConversationSoFar)-1]
		writingSession, err := utils.ParseWritingSession(lastMsg)
		if err != nil {
			log.Printf("Error parsing last writing session: %v", err)
		} else {
			// Calculate total session time
			var totalTime = 8000
			for _, keystroke := range writingSession.KeyStrokes {
				totalTime += keystroke.Delay
			}
			fmt.Println("Total time for session:", totalTime)
			fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
			fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
			fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
			fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
			fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
			fmt.Println("((((((((((((((((((((((((((((((((()))))))))))))))))))))))))))))))))")
			// If session was longer than 480 seconds (8 minutes)
			if totalTime > 480000 { // Convert to milliseconds
				log.Printf("Long writing session detected (%d ms). Triggering Anky creation", totalTime)
				go func() {
					ankyService, err := services.NewAnkyService(s.store)
					if err != nil {
						log.Printf("Error creating anky service for long session: %v", err)
						return
					}
					ankyService.ProcessAnkyCreationFromWritingString(ctx, writingSession.RawContent, writingSession.SessionID, writingSession.UserID)
				}()
			}
		}
	}

	// Call service to process conversation
	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		log.Printf("Error creating anky service: %v", err)
		return err
	}

	response, err := ankyService.ReflectBackFromWritingSessionConversation(req.ConversationSoFar)
	if err != nil {
		log.Printf("Error processing writing conversation: %v", err)
		return err
	}
	log.Printf("Successfully generated response of length: %d", len(response))

	return WriteJSON(w, http.StatusOK, map[string]string{
		"prompt": response,
	})
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
	if user == nil {
		return fmt.Errorf("failed to create new user object")
	}

	log.Printf("Created new user object with wallet address: %s", user.WalletAddress)

	tokenString, err := utils.CreateJWT(user)
	if err != nil {
		log.Printf("Error creating JWT: %v", err)
		return err
	}
	user.JWT = tokenString
	log.Println("Generated JWT token for user")

	// Validate store is initialized
	if s.store == nil {
		return fmt.Errorf("database store is not initialized")
	}

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
	fmt.Println("=== Starting handleRawWritingSession endpoint ===")
	fmt.Printf("🔍 Received %s request with headers: %+v\n", r.Method, r.Header)

	// Read and decode JSON request
	var requestData struct {
		WritingString string `json:"writingString"`
	}

	fmt.Println("👉 Attempting to decode request body...")
	if err := json.NewDecoder(r.Body).Decode(&requestData); err != nil {
		fmt.Printf("❌ Failed to decode request body: %v\n", err)
		return err
	}
	defer r.Body.Close()

	fmt.Printf("📝 Received writing string (first 50 chars): %s...\n", requestData.WritingString[:min(50, len(requestData.WritingString))])

	// Split the writing string into lines
	fmt.Println("✂️ Splitting writing string into lines...")
	lines := strings.Split(requestData.WritingString, "\n")
	fmt.Printf("📊 Found %d lines in writing string\n", len(lines))

	if len(lines) < 4 {
		fmt.Printf("❌ Invalid format: Not enough lines (got %d, need at least 4)\n", len(lines))
		return fmt.Errorf("invalid writing session format: insufficient lines (got %d, need at least 4)", len(lines))
	}

	// Extract metadata from first 4 lines
	fmt.Println("🔍 Extracting metadata from first 4 lines...")
	userId := strings.TrimSpace(lines[0])
	sessionId := strings.TrimSpace(lines[1])
	prompt := strings.TrimSpace(lines[2])
	startingTimestamp := strings.TrimSpace(lines[3])

	fmt.Println("📋 Extracted metadata:")
	fmt.Printf("👤 User ID: %s\n", userId)
	fmt.Printf("🔑 Session ID: %s\n", sessionId)
	fmt.Printf("💭 Prompt: %s\n", prompt)
	fmt.Printf("⏰ Starting Timestamp: %s\n", startingTimestamp)

	// Get writing content (remaining lines)
	writingContent := strings.Join(lines[4:], "\n")
	fmt.Printf("📜 Writing content length: %d bytes\n", len(writingContent))
	fmt.Printf("📖 Preview of writing content: %s...\n", writingContent[:min(100, len(writingContent))])

	// Create data directory structure if it doesn't exist
	fmt.Println("📁 Setting up directory structure...")
	userDir := fmt.Sprintf("data/writing_sessions/%s", userId)
	if err := os.MkdirAll(userDir, 0755); err != nil {
		fmt.Printf("❌ Failed to create directory structure: %v\n", err)
		return err
	}
	fmt.Printf("✅ Created/verified directory: %s\n", userDir)

	// Save individual writing session file
	fmt.Println("💾 Saving individual writing session file...")
	sessionFilePath := fmt.Sprintf("%s/%s.txt", userDir, sessionId)
	if err := os.WriteFile(sessionFilePath, []byte(requestData.WritingString), 0644); err != nil {
		fmt.Printf("❌ Failed to write session file: %v\n", err)
		return err
	}
	fmt.Printf("✅ Saved session file to: %s\n", sessionFilePath)

	// Update all_writing_sessions.txt
	fmt.Println("📝 Updating master sessions list...")
	allSessionsPath := fmt.Sprintf("%s/all_writing_sessions.txt", userDir)
	f, err := os.OpenFile(allSessionsPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Printf("❌ Failed to open all_writing_sessions.txt: %v\n", err)
		return err
	}
	defer f.Close()

	// Add newline before new session ID if file is not empty
	fileInfo, err := f.Stat()
	if err != nil {
		fmt.Printf("❌ Failed to get file info: %v\n", err)
		return err
	}

	if fileInfo.Size() > 0 {
		if _, err := f.WriteString("\n"); err != nil {
			fmt.Printf("❌ Failed to write newline: %v\n", err)
			return err
		}
	}

	if _, err := f.WriteString(sessionId); err != nil {
		fmt.Printf("❌ Failed to write session ID: %v\n", err)
		return err
	}
	fmt.Println("✅ Successfully updated master sessions list")

	response := map[string]interface{}{
		"userId":            userId,
		"sessionId":         sessionId,
		"prompt":            prompt,
		"startingTimestamp": startingTimestamp,
		"writingContent":    writingContent,
	}

	fmt.Println("🔄 Preparing response...")
	fmt.Printf("📦 Response object: %+v\n", response)

	err = WriteJSON(w, http.StatusOK, response)
	if err != nil {
		fmt.Printf("❌ Failed to write JSON response: %v\n", err)
		return err
	}

	fmt.Println("✨ Successfully completed handleRawWritingSession")
	// Get feedback from Anky about the writing session
	err = WriteJSON(w, http.StatusOK, response)
	if err != nil {
		fmt.Printf("❌ Failed to write JSON response with feedback: %v\n", err)
		return err
	}

	// Parse the writing session
	fmt.Println("🔍 Parsing writing session...")
	session, err := utils.ParseWritingSession(writingContent)
	if err != nil {
		fmt.Printf("❌ Failed to parse writing session: %v\n", err)
		return err
	}

	// Create a slice to store the conversation
	fmt.Println("💬 Creating conversation for reflection...")
	conversation := []string{
		fmt.Sprintf("The user wrote for %d minutes. Here is what they wrote: %s",
			len(session.KeyStrokes)/60, // Rough estimate of minutes based on keystrokes
			session.RawContent),
	}

	// Get reflection from Anky service
	fmt.Println("🤖 Getting reflection from Anky service...")
	ankyService, err := services.NewAnkyService(s.store)
	if err != nil {
		fmt.Printf("❌ Failed to create anky service: %v\n", err)
		return err
	}
	reflection, err := ankyService.ReflectBackFromWritingSessionConversation(conversation)
	if err != nil {
		fmt.Printf("❌ Failed to get reflection: %v\n", err)
		return err
	}

	// Add reflection to response
	fmt.Println("✍️ Adding reflection to response...")
	response["reflection"] = reflection
	return WriteJSON(w, http.StatusOK, "ok, but why?")
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
