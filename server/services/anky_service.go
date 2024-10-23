package services

import (
	"encoding/json"
	"errors"
	"log"
	"os"

	"github.com/ankylat/anky/server/models"
)

const dataFile = "writing_sessions.json"

func SaveWritingSession(session *models.WritingSession) error {
	sessions, err := readSessions()
	if err != nil {
		return err
	}

	sessions = append(sessions, *session)

	return writeSessions(sessions)
}

func GetUserWritingSessions(userID string) ([]models.WritingSession, error) {
	sessions, err := readSessions()
	if err != nil {
		return nil, err
	}

	userSessions := []models.WritingSession{}
	for _, session := range sessions {
		if session.UserID == userID {
			userSessions = append(userSessions, session)
		}
	}

	if len(userSessions) == 0 {
		return nil, errors.New("no writing sessions found for user")
	}

	return userSessions, nil
}

func readSessions() ([]models.WritingSession, error) {
	if _, err := os.Stat(dataFile); os.IsNotExist(err) {
		// If the file doesn't exist, create it with an empty array
		err = writeSessions([]models.WritingSession{})
		if err != nil {
			return nil, err
		}
		return []models.WritingSession{}, nil
	}

	file, err := os.ReadFile(dataFile)
	if err != nil {
		log.Printf("Error reading data file: %v", err)
		return nil, err
	}

	var sessions []models.WritingSession
	err = json.Unmarshal(file, &sessions)
	if err != nil {
		log.Printf("Error unmarshaling data: %v", err)
		return nil, err
	}

	return sessions, nil
}

func writeSessions(sessions []models.WritingSession) error {
	data, err := json.MarshalIndent(sessions, "", "  ")
	if err != nil {
		log.Printf("Error marshaling data: %v", err)
		return err
	}

	err = os.WriteFile(dataFile, data, 0644)
	if err != nil {
		log.Printf("Error writing data file: %v", err)
		return err
	}

	return nil
}