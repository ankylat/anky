package handlers

import (
	"net/http"

	"github.com/ankylat/anky/server/models"
	"github.com/ankylat/anky/server/services"
	"github.com/gin-gonic/gin"
)

func SubmitWritingSession(c *gin.Context) {
	var session models.WritingSession
	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from the authenticated context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	session.UserID = userID.(string)

	// Process the writing session with AI
	aiService := services.NewAIService()
	imagePrompt, selfInquiryQuestion, err := aiService.ProcessWritingSession(session.Content)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process writing with AI"})
		return
	}

	// Update the session with AI-generated content
	session.ProcessAIContent(imagePrompt, selfInquiryQuestion)

	// Set validity of the Anky
	session.SetValidAnky()

	// Calculate and set Newen earned
	newenService := services.NewNewenService()
	newenEarned := newenService.CalculateNewenEarned(session.UserID, session.IsValidAnky)
	session.NewenEarned = float64(newenEarned) // Convert int to float64

	// Save the processed writing session
	err = services.SaveWritingSession(session)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save writing session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":               "Writing session submitted and processed successfully",
		"is_valid_anky":         session.IsValidAnky,
		"newen_earned":          session.NewenEarned,
		"image_prompt":          session.ImagePrompt,
		"self_inquiry_question": session.SelfInquiryQuestion,
	})
}