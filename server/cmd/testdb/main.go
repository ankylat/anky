package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4/pgxpool"
)

func main() {
	// Connect to database
	connString := "postgresql://anky:development@localhost:5555/anky_db?sslmode=disable"
	db, err := pgxpool.Connect(context.Background(), connString)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer db.Close()

	// Test 1: Create a user
	userID := uuid.New()
	fmt.Println("Creating user with ID:", userID)

	_, err = db.Exec(context.Background(), "INSERT INTO users (id, privy_did, fid, settings) VALUES ($1, $2, $3, $4)", userID, "did:privy:123", 42069, `{"notification_preferences": {"email_notifications": true}}`)
	if err != nil {
		log.Fatalf("Failed to create user: %v", err)
	}
	fmt.Println("✅ User created successfully")

	// Test 2: Create a writing session
	sessionID := uuid.New()
	fmt.Println("\nCreating writing session with ID:", sessionID)

	_, err = db.Exec(context.Background(), "INSERT INTO writing_sessions (id, user_id, content, words_written, time_spent, prompt, is_anky, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", sessionID, userID, "This is a test writing session", 100, 500, "Test prompt", true, "pending_processing")
	if err != nil {
		log.Fatalf("Failed to create writing session: %v", err)
	}
	fmt.Println("✅ Writing session created successfully")

	// Test 3: Create an Anky generation
	ankyID := uuid.New()
	fmt.Println("\nCreating Anky generation with ID:", ankyID)

	_, err = db.Exec(context.Background(), "INSERT INTO anky_generations (id, session_id, reflection, image_prompt, follow_up_prompts, image_url) VALUES ($1, $2, $3, $4, $5, $6)", ankyID, sessionID, "This is a reflection", "Generate a peaceful scene", []string{"Follow up 1", "Follow up 2"}, "https://example.com/image.jpg")
	if err != nil {
		log.Fatalf("Failed to create Anky generation: %v", err)
	}
	fmt.Println("✅ Anky generation created successfully")

	// Test 4: Read everything back
	fmt.Println("\nReading all data back:")

	var (
		privyDID, content, reflection string
		fid                           int
		isAnky                        bool
		createdAt                     time.Time
	)

	query := `
		SELECT u.privy_did, u.fid, ws.content, ws.is_anky, ag.reflection, ws.created_at
		FROM users u
		JOIN writing_sessions ws ON ws.user_id = u.id
		JOIN anky_generations ag ON ag.session_id = ws.id
		WHERE u.id = $1`

	err = db.QueryRow(context.Background(), query, userID).Scan(&privyDID, &fid, &content, &isAnky, &reflection, &createdAt)
	if err != nil {
		log.Fatalf("Failed to read data back: %v", err)
	}

	fmt.Printf(`
Found data:
- User PrivyDID: %s
- User FID: %d
- Writing Content: %s
- Is Anky: %v
- Anky Reflection: %s
- Created At: %v
`, privyDID, fid, content, isAnky, reflection, createdAt)
}
