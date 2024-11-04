package main

import (
	"log"

	"github.com/ankylat/anky/server/api"
	"github.com/ankylat/anky/server/storage"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	store, err := storage.NewPostgresStore()
	if err != nil {
		log.Fatal(err)
	}

	server, err := api.NewAPIServer(":8080", store)
	if err != nil {
		log.Fatal(err)
	}

	server.Run()
}
