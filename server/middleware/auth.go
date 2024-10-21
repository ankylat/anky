package middleware

import (
	"encoding/base64"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
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