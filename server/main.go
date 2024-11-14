package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/ankylat/anky/server/api"
	"github.com/ankylat/anky/server/storage"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: Error loading .env file: %v", err)
		log.Println("Continuing with existing environment variables...")
	}

	// Initialize database connection
	store, err := storage.NewPostgresStore()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Verify database connection
	log.Println("Successfully connected to database")

	// Initialize API server
	port := ":8888"
	server, err := api.NewAPIServer(port, store)
	if err != nil {
		log.Fatalf("Failed to create API server: %v", err)
	}

	// Create channel for graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	serverErrors := make(chan error, 1)
	go func() {
		log.Printf("Starting server on port %s...", port)
		if err := server.Run(); err != nil {
			serverErrors <- err
		}
	}()

	// Wait for shutdown signal or server error
	select {
	case err := <-serverErrors:
		log.Fatalf("Server error: %v", err)
	case <-stop:
		log.Println("Shutting down server gracefully...")
		// Add cleanup code here if needed
	}
}
