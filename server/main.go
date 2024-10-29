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

	// Static files should be served from server/static/templates
	// This is a common Go convention - static assets live under server/static
	// with subdirectories for different types (templates, images, css etc)
	r.Static("/static", "./static")

	// Existing routes
	r.POST("/talk-to-anky", handlers.HandleChat)
	r.GET("/user-casts/:fid", handlers.HandleUserCastsNeynar)
	r.GET("/generated-anky-on-frame/:sessionId", handlers.HandleRenderAnkyOnFarcasterFrame)
	r.GET("/anky-frame-images/:sessionId", handlers.HandleAnkyFrameImage)
	r.POST("/generate-anky-from-prompt", handlers.GenerateAnkyFromPrompt)

	r.GET("/post/:id", handlers.ServeAnkyPost)
	// New route for submitting writing sessions
	r.POST("/submit-writing-session", middleware.PrivyAuth(appID, appSecret), handlers.SubmitWritingSession)
	r.GET("/create-new-wallet", handlers.CreateNewWallet)

	// Farcaster routes
	farcasterGroup := r.Group("/farcaster")
	{
		farcasterGroup.GET("/user/:fid", handlers.GetFarcasterUser)
		farcasterGroup.GET("/casts/:fid", handlers.GetUserCastsByFid)
		farcasterGroup.GET("/cast/:hash", handlers.GetCastFromHash)
		farcasterGroup.POST("/cast", handlers.CreateCast)
		farcasterGroup.POST("/cast-reaction/:hash", handlers.CreateCastReaction)
	}

	// Start the server
	log.Println("Starting server on :8888")
	if err := r.Run(":8888"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
