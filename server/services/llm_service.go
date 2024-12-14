package services

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/ankylat/anky/server/types"
)

type LLMService struct {
	client *http.Client
}

func NewLLMService() *LLMService {
	return &LLMService{
		client: &http.Client{},
	}
}

func (s *LLMService) SendSimpleRequest(prompt string) (<-chan string, error) {
	fmt.Println("=== SendSimpleRequest START ===")
	fmt.Println("Input prompt:", prompt)

	llmRequest := types.LLMRequest{
		Model:  "llama3.2",
		Prompt: prompt,
	}
	fmt.Println("Created LLMRequest object:", llmRequest)

	jsonData, err := json.Marshal(llmRequest)
	if err != nil {
		fmt.Println("ERROR: Failed to marshal LLMRequest:", err)
		return nil, err
	}
	fmt.Println("Successfully marshaled request to JSON:", string(jsonData))

	req, err := http.NewRequest("POST", "http://localhost:11434/api/generate", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("ERROR: Failed to create HTTP request:", err)
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	fmt.Println("Created HTTP request with headers:", req.Header)

	fmt.Println("Sending HTTP request...")
	resp, err := s.client.Do(req)
	if err != nil {
		fmt.Println("ERROR: Failed to send HTTP request:", err)
		return nil, fmt.Errorf("failed to send HTTP request: %v", err)
	}
	fmt.Println("Received response with status:", resp.Status)

	if resp.StatusCode != http.StatusOK {
		fmt.Println("ERROR: Unexpected status code:", resp.StatusCode)
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	fmt.Println("Creating response channel...")
	responseChan := make(chan string)

	go func() {
		fmt.Println("Starting goroutine to process response...")
		defer func() {
			fmt.Println("Closing response body and channel...")
			resp.Body.Close()
			close(responseChan)
		}()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			fmt.Println("ERROR: Failed to read response body:", err)
			return
		}
		fmt.Println("Successfully read response body:", string(body))

		// Parse the JSON response to get just the "response" field
		var llmResponse struct {
			Response string `json:"response"`
		}
		if err := json.Unmarshal(body, &llmResponse); err != nil {
			fmt.Println("ERROR: Failed to unmarshal response:", err)
			return
		}

		fmt.Println("Sending response through channel...")
		responseChan <- llmResponse.Response
		fmt.Println("Response sent through channel")
	}()

	fmt.Println("=== SendSimpleRequest END ===")
	return responseChan, nil
}

func (s *LLMService) SendChatRequest(chatRequest types.ChatRequest, jsonFormatting bool) (<-chan string, error) {
	fmt.Println("SendChatRequest called with:", chatRequest)

	llmRequest := types.LLMRequest{
		Model:    "llama3.2",
		Messages: chatRequest.Messages,
		Stream:   false,
	}
	if jsonFormatting {
		llmRequest.Format = "json"
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
			var streamResponse types.StreamResponse
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
