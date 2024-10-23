package handlers

import (
	"log"
	"net/http"

	"github.com/ankylat/anky/server/models"
	"github.com/ankylat/anky/server/services"
	"github.com/gin-gonic/gin"
)

func SubmitWritingSession(c *gin.Context) {
	var session models.WritingSession
	if err := c.ShouldBindJSON(&session); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from the authenticated context
	userID, exists := c.Get("userID")
	if !exists {
		log.Println("User not authenticated")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	session.UserID = userID.(string)
	log.Printf("Processing session for user: %s", session.UserID)

	// Save the writing session to the PostgreSQL database
	err := services.SaveWritingSession(&session)
	if err != nil {
		log.Printf("Failed to save writing session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save writing session"})
		return
	}

	log.Println("Writing session saved successfully")

	c.JSON(http.StatusOK, gin.H{
		"message":    "Writing session submitted and saved successfully",
		"session_id": session.SessionID,
	})
}