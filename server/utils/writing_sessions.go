package utils

import (
	"fmt"
	"strconv"
	"strings"
)

type WritingSession struct {
	UserID     string
	SessionID  string
	Prompt     string
	Timestamp  string
	KeyStrokes []KeyStroke
	RawContent string
}

type KeyStroke struct {
	Key   string
	Delay int
}

func ParseWritingSession(content string) (*WritingSession, error) {
	lines := strings.Split(content, "\n")
	if len(lines) < 4 {
		return nil, fmt.Errorf("invalid writing session format")
	}

	session := &WritingSession{
		UserID:    strings.TrimSpace(lines[0]),
		SessionID: strings.TrimSpace(lines[1]),
		Prompt:    strings.TrimSpace(lines[2]),
		Timestamp: strings.TrimSpace(lines[3]),
	}

	var keyStrokes []KeyStroke
	var constructedText strings.Builder

	for i := 4; i < len(lines); i++ {
		line := lines[i] // Don't trim the space here
		if line == "" {
			continue
		}

		// Handle the case where the line starts with a space (meaning it's a space keystroke)
		var key string
		var delayStr string

		if strings.HasPrefix(line, " ") && strings.Count(line, " ") == 2 {
			// This is a space keystroke
			key = " "
			delayStr = strings.TrimSpace(line)
		} else {
			lastSpaceIndex := strings.LastIndex(line, " ")
			if lastSpaceIndex == -1 {
				continue
			}
			key = strings.TrimSpace(line[:lastSpaceIndex])
			delayStr = strings.TrimSpace(line[lastSpaceIndex+1:])
		}

		delay, err := strconv.Atoi(delayStr)
		if err != nil {
			continue
		}

		keyStroke := KeyStroke{
			Key:   key,
			Delay: delay,
		}
		keyStrokes = append(keyStrokes, keyStroke)

		switch key {
		case "Backspace":
			if constructedText.Len() > 0 {
				str := constructedText.String()
				constructedText.Reset()
				constructedText.WriteString(str[:len(str)-1])
			}
		case "Enter":
			constructedText.WriteString("\n")
		case " ":
			constructedText.WriteRune(' ')
		default:
			constructedText.WriteString(key)
		}
	}

	session.KeyStrokes = keyStrokes
	session.RawContent = constructedText.String()

	return session, nil
}

func TranslateToTheAnkyverse(sessionID string) string {
	// Define the Ankyverse characters
	characters := []string{
		"\u0C85", "\u0C86", "\u0C87", "\u0C88", "\u0C89", "\u0C8A", "\u0C8B", "\u0C8C", "\u0C8E", "\u0C8F",
		"\u0C90", "\u0C92", "\u0C93", "\u0C94", "\u0C95", "\u0C96", "\u0C97", "\u0C98", "\u0C99", "\u0C9A",
		"\u0C9B", "\u0C9C", "\u0C9D", "\u0C9E", "\u0C9F", "\u0CA0", "\u0CA1", "\u0CA2", "\u0CA3", "\u0CA4",
		"\u0CA5", "\u0CA6", "\u0CA7", "\u0CA8", "\u0CAA", "\u0CAB", "\u0CAC", "\u0CAD", "\u0CAE", "\u0CAF",
		"\u0CB0", "\u0CB1", "\u0CB2", "\u0CB3", "\u0CB5", "\u0CB6", "\u0CB7", "\u0CB8", "\u0CB9", "\u0CBC",
		"\u0CBD", "\u0CBE", "\u0CBF", "\u0CC0", "\u0CC1", "\u0CC2", "\u0CC3", "\u0CC4", "\u0CC6", "\u0CC7",
		"\u0CC8", "\u0CCA", "\u0CCB", "\u0CCC", "\u0CCD", "\u0CD5", "\u0CD6", "\u0CDE", "\u0CE0", "\u0CE1",
		"\u0CE2", "\u0CE3", "\u0CE6", "\u0CE7", "\u0CE8", "\u0CE9", "\u0CEA", "\u0CEB", "\u0CEC", "\u0CED",
		"\u0CEE", "\u0CEF", "\u0CF1", "\u0CF2", "\u0C05", "\u0C06", "\u0C07", "\u0C08", "\u0C09", "\u0C0A",
		"\u0C0B", "\u0C0C", "\u0C0E", "\u0C0F", "\u0C10", "\u0C12", "\u0C13", "\u0C14",
	}

	// Encode the sessionID to Ankyverse language
	var encoded strings.Builder
	for i := 0; i < len(sessionID); i++ {
		charCode := int(sessionID[i])
		index := (charCode - 32) % len(characters)
		encoded.WriteString(characters[index])
	}

	return encoded.String()
}
