package services

import (
	"fmt"

	"github.com/ankylat/anky/server/models"
)

type AIService struct {
	llmService *LLMService
}

func NewAIService() *AIService {
	return &AIService{
		llmService: NewLLMService(),
	}
}

func (s *AIService) ProcessWritingSession(content string) (string, string, error) {
	// Generate image prompt
	imagePrompt, err := s.generateImagePrompt(content)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate image prompt: %w", err)
	}

	// Generate self-inquiry question
	selfInquiryQuestion, err := s.generateSelfInquiryQuestion(content)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate self-inquiry question: %w", err)
	}

	return imagePrompt, selfInquiryQuestion, nil
}

func (s *AIService) generateImagePrompt(content string) (string, error) {
	messages := []models.Message{
		{Role: "system", Content: "You are an AI assistant tasked with generating image prompts based on writing content."},
		{Role: "user", Content: fmt.Sprintf("Generate a concise image prompt based on the following writing:\n\n%s", content)},
	}

	chatRequest := models.ChatRequest{Messages: messages}
	responseChan, err := s.llmService.SendChatRequest(chatRequest)
	if err != nil {
		return "", err
	}

	var imagePrompt string
	for msg := range responseChan {
		imagePrompt += msg
	}

	return imagePrompt, nil
}

func (s *AIService) generateSelfInquiryQuestion(content string) (string, error) {
	messages := []models.Message{
		{Role: "system", Content: "You are an AI assistant tasked with generating self-inquiry questions based on writing content."},
		{Role: "user", Content: fmt.Sprintf("Generate a thought-provoking self-inquiry question based on the following writing:\n\n%s", content)},
	}

	chatRequest := models.ChatRequest{Messages: messages}
	responseChan, err := s.llmService.SendChatRequest(chatRequest)
	if err != nil {
		return "", err
	}

	var selfInquiryQuestion string
	for msg := range responseChan {
		selfInquiryQuestion += msg
	}

	return selfInquiryQuestion, nil
}

