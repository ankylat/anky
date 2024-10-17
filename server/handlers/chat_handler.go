package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ankylat/anky/server/models"
	"github.com/ankylat/anky/server/services"
)

func HandleChat(c *gin.Context) {
	fmt.Println("Handling chat request")

	var chatRequest models.ChatRequest
	if err := c.ShouldBindJSON(&chatRequest); err != nil {
		fmt.Println("Error binding JSON:", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	fmt.Println("Chat request bound successfully")

	llmService := services.NewLLMService()
	fmt.Println("LLM service created")

	responseChan, err := llmService.SendChatRequest(chatRequest)
	if err != nil {
		fmt.Println("Error sending chat request:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	fmt.Println("Chat request sent successfully")

	var fullResponse string
	for msg := range responseChan {
		fullResponse += msg
	}
	fmt.Println("Full response received from LLM")

	c.JSON(http.StatusOK, gin.H{"response": fullResponse})
	fmt.Println("Response sent to client")
}