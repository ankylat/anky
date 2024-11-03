package services

import (
	"context"
	"encoding/json"
	"errors"
	"log"

	"github.com/ankylat/anky/server/database"
	"github.com/ankylat/anky/server/models"
)

func SaveWritingSession(session *models.WritingSession) error {
	log.Println("Creating new database connection for SaveWritingSession")
	db, err := database.NewDatabase()
	if err != nil {
		return err
	}
	defer db.Close()

	log.Printf("Attempting to save writing session with ID: %s", session.ID)
	err = db.CreateWritingSession(context.Background(), session)
	if err != nil {
		log.Printf("Error creating writing session: %v", err)
		return err
	}
	log.Printf("Successfully saved writing session with ID: %s", session.ID)

	return nil
}

func GetUserWritingSessions(userID string) ([]models.WritingSession, error) {
	// TODO: Add GetUserWritingSessions query to database package
	return nil, errors.New("not implemented")
}

func GetAnkyFromDatabase(sessionID string) (*models.WritingSession, error) {
	log.Println("Creating new database connection for GetAnkyFromDatabase")
	db, err := database.NewDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	log.Printf("Attempting to fetch writing session with ID: %s", sessionID)
	session, err := db.GetWritingSession(context.Background(), sessionID)
	if err != nil {
		log.Printf("Error fetching writing session: %v", err)
		return nil, err
	}

	// Log the retrieved session as JSON
	sessionJSON, err := json.MarshalIndent(session, "", "  ")
	if err != nil {
		log.Printf("Error marshalling session to JSON: %v", err)
	} else {
		log.Printf("Retrieved writing session: %s", string(sessionJSON))
	}

	return session, nil
}

func UpdateWritingSession(updatedSession *models.WritingSession) error {
	log.Println("Creating new database connection for UpdateWritingSession")
	db, err := database.NewDatabase()
	if err != nil {
		return err
	}
	defer db.Close()

	log.Printf("Attempting to update writing session with ID: %s", updatedSession.ID)
	err = db.UpdateWritingSession(context.Background(), updatedSession)
	if err != nil {
		log.Printf("Error updating writing session: %v", err)
		return err
	}
	log.Printf("Successfully updated writing session with ID: %s", updatedSession.ID)

	return nil
}

func GetRecentValidAnkys() ([]models.WritingSession, error) {
	db, err := database.NewDatabase()
	if err != nil {
		return nil, err
	}
	defer db.Close()

	return db.GetRecentValidAnkys(context.Background())
}
