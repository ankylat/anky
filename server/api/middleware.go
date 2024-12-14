package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/ankylat/anky/server/types"
	"golang.org/x/time/rate"
)

// PrivyAuth is a middleware function that authenticates requests using Privy
func PrivyAuth(appID, appSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Println("Starting PrivyAuth middleware")

			// Check for the Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				log.Println("Missing authorization header")
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: "Missing authorization header"})
				return
			}

			log.Printf("Received Authorization header: %s", authHeader)

			// Remove "Bearer " prefix if present
			token := authHeader
			if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
				token = authHeader[7:]
				log.Println("Removed 'Bearer ' prefix from token")
			}

			// Create the Basic Auth header for Privy API
			auth := base64.StdEncoding.EncodeToString([]byte(appID + ":" + appSecret))
			log.Println("Created Basic Auth header")

			// Create a new request to Privy API
			req, err := http.NewRequest("GET", "https://auth.privy.io/api/v1/users/me", nil)
			if err != nil {
				log.Printf("Failed to create request: %v", err)
				WriteJSON(w, http.StatusInternalServerError, ApiError{Error: "Failed to create request"})
				return
			}
			log.Println("Created new request to Privy API")

			// Set the required headers for Privy API request
			req.Header.Set("Authorization", "Basic "+auth)
			req.Header.Set("privy-app-id", appID)
			req.Header.Set("Authorization", "Bearer "+token)
			log.Println("Set headers for Privy API request")

			// Send the request to Privy API
			client := &http.Client{}
			log.Println("Sending request to Privy API")
			resp, err := client.Do(req)
			if err != nil {
				log.Printf("Failed to send request: %v", err)
				WriteJSON(w, http.StatusInternalServerError, ApiError{Error: "Failed to send request"})
				return
			}
			defer resp.Body.Close()
			log.Printf("Received response from Privy API with status: %s", resp.Status)

			// Check if the response status is OK
			if resp.StatusCode != http.StatusOK {
				log.Printf("Invalid token. Status code: %d", resp.StatusCode)
				WriteJSON(w, http.StatusUnauthorized, ApiError{Error: "Invalid token"})
				return
			}

			// Read and parse the response body
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				log.Printf("Failed to read response: %v", err)
				WriteJSON(w, http.StatusInternalServerError, ApiError{Error: "Failed to read response"})
				return
			}
			log.Printf("Response body: %s", string(body))

			// Define a struct to hold the user information
			var privyUser types.PrivyUser

			// Unmarshal the JSON response into the privyUser struct
			err = json.Unmarshal(body, &privyUser)
			if err != nil {
				log.Printf("Failed to parse response: %v", err)
				WriteJSON(w, http.StatusInternalServerError, ApiError{Error: "Failed to parse response"})
				return
			}

			// Store the privyUser in the request context
			ctx := r.Context()
			ctx = context.WithValue(ctx, "privyUser", privyUser)
			r = r.WithContext(ctx)
			log.Printf("Set privyUser in context: %+v", privyUser)

			log.Println("PrivyAuth middleware completed successfully")
			next.ServeHTTP(w, r)
		})
	}
}

// Logger is a middleware function that logs request details
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		path := r.URL.Path
		raw := r.URL.RawQuery

		// Call the next handler
		next.ServeHTTP(w, r)

		// Calculate request duration and log request details
		latency := time.Since(start)
		clientIP := r.RemoteAddr
		method := r.Method

		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[HTTP] %v | %15s | %-7s %s | %13v\n",
			start.Format("2006/01/02 - 15:04:05"),
			clientIP,
			method,
			path,
			latency,
		)
	})
}

// RateLimiter is a middleware function that implements rate limiting
func RateLimiter(next http.Handler) http.Handler {
	// Create a new rate limiter that allows 1 request per second with a burst of 5
	limiter := rate.NewLimiter(1, 5)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if the request is allowed based on the rate limit
		if !limiter.Allow() {
			WriteJSON(w, http.StatusTooManyRequests, ApiError{Error: "Too many requests"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
