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

func PrivyAuth(appID, appSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		log.Println("Starting PrivyAuth middleware")

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

		// Create the Basic Auth header
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

		// Set the required headers
		req.Header.Set("Authorization", "Basic "+auth)
		req.Header.Set("privy-app-id", appID)
		req.Header.Set("Authorization", "Bearer "+token)
		log.Println("Set headers for Privy API request")

		// Send the request
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

		// Check the response status
		if resp.StatusCode != http.StatusOK {
			log.Printf("Invalid token. Status code: %d", resp.StatusCode)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Read and parse the response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read response: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
			c.Abort()
			return
		}
		log.Printf("Response body: %s", string(body))

		var user struct {
			ID string `json:"id"`
		}
		err = json.Unmarshal(body, &user)
		if err != nil {
			log.Printf("Failed to parse response: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			c.Abort()
			return
		}

		// Set the user ID in the context for later use
		c.Set("userID", user.ID)
		log.Printf("Set userID in context: %s", user.ID)

		log.Println("PrivyAuth middleware completed successfully")
		c.Next()
	}
}

func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery

		c.Next()

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

func RateLimiter() gin.HandlerFunc {
	limiter := rate.NewLimiter(1, 5)
	return func(c *gin.Context) {
		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests"})
			c.Abort()
			return
		}
		c.Next()
	}
}