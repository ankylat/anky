package services

import (
	"errors"

	"github.com/ankylat/anky/server/models"
)

// Mock database for demonstration purposes
var writingSessions []models.WritingSession

func SaveWritingSession(session models.WritingSession) error {
	// In a real application, you would save this to a database
	writingSessions = append(writingSessions, session)
	return nil
}

func GetUserWritingSessions(userID string) ([]models.WritingSession, error) {
	var userSessions []models.WritingSession
	for _, session := range writingSessions {
		if session.UserID == userID {
			userSessions = append(userSessions, session)
		}
	}
	if len(userSessions) == 0 {
		return nil, errors.New("no writing sessions found for user")
	}
	return userSessions, nil
}