package main

import (
	"log"

	"github.com/ankylat/anky/server/database"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	store, err := database.NewPostgresStore()
	if err != nil {
		log.Fatal(err)
	}

	if err := store.Init(); err != nil {
		log.Fatal(err)
	}

	server, err := NewAPIServer(":8080", store)
	if err != nil {
		log.Fatal(err)
	}

	server.Run()

	// r := gin.Default()

	// // Add middleware for logging and potential rate limiting
	// r.Use(middleware.Logger())
	// r.Use(middleware.RateLimiter())

	// // Static files should be served from server/static/templates
	// // This is a common Go convention - static assets live under server/static
	// // with subdirectories for different types (templates, images, css etc)
	// r.Static("/static", "./static")

	// // Existing routes
	// r.POST("/talk-to-anky", handlers.HandleChat)
	// r.GET("/user-casts/:fid", handlers.HandleUserCastsNeynar)
	// r.GET("/generated-anky-on-frame/:sessionId", handlers.HandleRenderAnkyOnFarcasterFrame)
	// r.GET("/anky-frame-images/:sessionId", handlers.HandleAnkyFrameImage)
	// r.POST("/generate-anky-from-prompt", handlers.GenerateAnkyFromPrompt)

	// r.GET("/post/:id", handlers.ServeAnkyPost)
	// // New route for submitting writing sessions
	// r.POST("/submit-writing-session", middleware.PrivyAuth(appID, appSecret), handlers.SubmitWritingSession)
	// r.GET("/recent-ankys", handlers.GetRecentAnkys)

	// // Farcaster routes
	// farcasterGroup := r.Group("/farcaster")
	// {
	// 	farcasterGroup.GET("/user/:fid", handlers.GetFarcasterUser)
	// 	farcasterGroup.GET("/casts/:fid", handlers.GetUserCastsByFid)
	// 	farcasterGroup.GET("/cast/:hash", handlers.GetCastFromHash)
	// 	farcasterGroup.POST("/cast", handlers.CreateCast)
	// 	farcasterGroup.POST("/cast-reaction/:hash", handlers.CreateCastReaction)
	// }

	// // Start the server
	// log.Println("Starting server on :8888")
	// if err := r.Run(":8888"); err != nil {
	// 	log.Fatalf("Failed to start server: %v", err)
	// }
}
