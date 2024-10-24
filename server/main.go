package main

import (
	"log"
	"os"

	"github.com/ankylat/anky/server/handlers"
	"github.com/ankylat/anky/server/middleware"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Get Privy app ID and secret from environment variables
	appID := os.Getenv("PRIVY_APP_ID")
	appSecret := os.Getenv("PRIVY_APP_SECRET")

	r := gin.Default()

	// Add middleware for logging and potential rate limiting
	r.Use(middleware.Logger())
	r.Use(middleware.RateLimiter())

	// Existing routes
	r.POST("/talk-to-anky", handlers.HandleChat)
	r.GET("/user-casts/:fid", handlers.HandleUserCasts)

	// New route for submitting writing sessions
	r.POST("/submit-writing-session", middleware.PrivyAuth(appID, appSecret), handlers.SubmitWritingSession)

	// Start the server
	log.Println("Starting server on :8888")
	if err := r.Run(":8888"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
