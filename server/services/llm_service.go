package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/ankylat/anky/server/models"
)

type LLMService struct {
	client *http.Client
}

func NewLLMService() *LLMService {
	fmt.Println("Creating new LLMService")
	return &LLMService{
		client: &http.Client{},
	}
}

func (s *LLMService) SendChatRequest(chatRequest models.ChatRequest) (<-chan string, error) {
	fmt.Println("SendChatRequest called with:", chatRequest)

	llmRequest := models.LLMRequest{
		Model:    "llama3.1",
		Messages: chatRequest.Messages,
		Stream:   false,
	}
	fmt.Printf("Created LLMRequest: %+v\n", llmRequest)

	jsonData, err := json.Marshal(llmRequest)
	if err != nil {
		fmt.Println("Error marshaling LLMRequest:", err)
		return nil, err
	}
	fmt.Println("Marshaled LLMRequest to JSON:", string(jsonData))

	req, err := http.NewRequest("POST", "http://localhost:11434/api/chat", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Error creating HTTP request:", err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	fmt.Println("Created HTTP request:", req)

	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Println("Error sending HTTP request:", err)
		return nil, err
	}
	fmt.Println("Received HTTP response:", resp.Status)

	responseChan := make(chan string)
	fmt.Println("Created response channel")

	go func() {
		fmt.Println("Started goroutine to process response")
		defer resp.Body.Close()
		defer close(responseChan)
		fmt.Println("Deferred response body close and channel close")

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			fmt.Println("Scanned new line from response body")
			var streamResponse models.StreamResponse
			if err := json.Unmarshal(scanner.Bytes(), &streamResponse); err != nil {
				fmt.Println("Error unmarshaling stream response:", err)
				continue
			}
			fmt.Printf("Unmarshaled stream response: %+v\n", streamResponse)
			responseChan <- streamResponse.Message.Content
			fmt.Println("Sent message content to response channel")
		}

		if err := scanner.Err(); err != nil {
			fmt.Println("Error reading stream:", err)
		}
		fmt.Println("Finished processing response")
	}()

	fmt.Println("Returning response channel")
	return responseChan, nil
}