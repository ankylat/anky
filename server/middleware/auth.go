package middleware

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// PrivyAuth is a middleware function that authenticates requests using Privy
func PrivyAuth(appID, appSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("Starting PrivyAuth middleware")

		// Check for the Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Println("Missing authorization header")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			c.Abort()
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
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request"})
			c.Abort()
			return
		}
		defer resp.Body.Close()
		log.Printf("Received response from Privy API with status: %s", resp.Status)

		// Check if the response status is OK
		if resp.StatusCode != http.StatusOK {
			log.Printf("Invalid token. Status code: %d", resp.StatusCode)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Read and parse the response body
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read response: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
			c.Abort()
			return
		}
		log.Printf("Response body: %s", string(body))

		// Define a struct to hold the user information
		var privyUser struct {
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
		}

		// Unmarshal the JSON response into the privyUser struct
		err = json.Unmarshal(body, &privyUser)
		if err != nil {
			log.Printf("Failed to parse response: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			c.Abort()
			return
		}

		// Set the entire privyUser struct in the context
		c.Set("privyUser", privyUser)
		log.Printf("Set privyUser in context: %+v", privyUser)

		log.Println("PrivyAuth middleware completed successfully")
		c.Next()
	}
}

// Logger is a middleware function that logs request details
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

		// Calculate request duration and log request details
		latency := time.Since(start)
		clientIP := c.ClientIP()
		method := c.Request.Method
		statusCode := c.Writer.Status()

		if raw != "" {
			path = path + "?" + raw
		}

		log.Printf("[GIN] %v | %3d | %13v | %15s | %-7s %s\n",
			start.Format("2006/01/02 - 15:04:05"),
			statusCode,
			latency,
			clientIP,
			method,
			path,
		)
	}
}

// RateLimiter is a middleware function that implements rate limiting
func RateLimiter() gin.HandlerFunc {
	// Create a new rate limiter that allows 1 request per second with a burst of 5
	limiter := rate.NewLimiter(1, 5)
	return func(c *gin.Context) {
		// Check if the request is allowed based on the rate limit
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			c.Abort()
			return
		}
		c.Next()
	}
}
