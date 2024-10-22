package handlers

import (
	"fmt"
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

	// Process the writing session with AI
	aiService := services.NewAIService()
	imagePrompt, selfInquiryQuestion, err := aiService.ProcessWritingSession(session.Content)
	if err != nil {
		log.Printf("Failed to process writing with AI: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process writing with AI"})
		return
	}

	// Update the session with AI-generated content
	session.ProcessAIContent(imagePrompt, selfInquiryQuestion)
	log.Printf("AI content processed. Image prompt: %s, Self-inquiry question: %s", imagePrompt, selfInquiryQuestion)

	// Set validity of the Anky
	isValidAnky := session.IsValidAnky() // Assuming this method exists and returns a bool
	log.Printf("Anky validity: %v", isValidAnky)

	// Calculate and set Newen earned
	newenService := services.NewNewenService()
	newenEarned := newenService.CalculateNewenEarned(session.UserID, isValidAnky)
	session.NewenEarned = float64(newenEarned) // Convert int to float64
	log.Printf("Newen earned: %f", session.NewenEarned)

	// Save the processed writing session
	err = services.SaveWritingSession(session)
	if err != nil {
		log.Printf("Failed to save writing session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save writing session"})
		return
	}

	log.Println("Writing session saved successfully")

	c.JSON(http.StatusOK, gin.H{
		"message":               "Writing session submitted and processed successfully",
		"is_valid_anky":         isValidAnky,
		"newen_earned":          session.NewenEarned,
		"image_prompt":          session.ImagePrompt,
		"self_inquiry_question": session.SelfInquiryQuestion,
	})
	fmt.Println("Response sent to client")
}