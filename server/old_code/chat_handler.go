package old_code

// import (
// 	"fmt"
// 	"net/http"

// 	"github.com/ankylat/anky/server/services"
// 	"github.com/ankylat/anky/server/types"
// 	"github.com/gin-gonic/gin"
// )

// func HandleChat(c *gin.Context) {
// 	fmt.Println("Handling chat request")

// 	var chatRequest types.ChatRequest
// 	if err := c.ShouldBindJSON(&chatRequest); err != nil {
// 		fmt.Println("Error binding JSON:", err)
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}
// 	fmt.Println("Chat request bound successfully")

// 	jsonFormatting := true
// 	if jsonFormattingParam := c.Query("json_formatting"); jsonFormattingParam != "" {
// 		if jsonFormattingParam == "false" {
// 			jsonFormatting = false
// 		}
// 	}
// 	fmt.Printf("json_formatting: %v\n", jsonFormatting)

// 	llmService := services.NewLLMService()
// 	fmt.Println("LLM service created")

// 	responseChan, err := llmService.SendChatRequest(chatRequest, jsonFormatting)
// 	if err != nil {
// 		fmt.Println("Error sending chat request:", err)
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
// 		return
// 	}
// 	fmt.Println("Chat request sent successfully")

// 	var fullResponse string
// 	for msg := range responseChan {
// 		fullResponse += msg
// 	}
// 	fmt.Println("Full response received from LLM")

// 	c.JSON(http.StatusOK, gin.H{"response": fullResponse})
// 	fmt.Println("Response sent to client")
// }
