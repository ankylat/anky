package main

import (
	"log"

	"github.com/ankylat/anky/server/handlers"
	"github.com/ankylat/anky/server/middleware"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// Add middleware for logging and potential rate limiting
	r.Use(middleware.Logger())
	r.Use(middleware.RateLimiter())

	// Existing routes
	r.POST("/talk-to-anky", handlers.HandleChat)
	r.GET("/user-casts/:fid", handlers.HandleUserCasts)

	// New route for submitting writing sessions
	r.POST("/submit-writing-session", handlers.SubmitWritingSession)

	// Start the server
	log.Println("Starting server on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}