package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID              uuid.UUID        `json:"id"`
	PrivyDID        string           `json:"privy_did"`
	FID             int              `json:"fid"`
	Settings        json.RawMessage  `json:"settings"`
	CreatedAt       time.Time        `json:"created_at"`
	UpdatedAt       time.Time        `json:"updated_at"`
	Ankys           []Anky           `json:"ankys"`
	WritingSessions []WritingSession `json:"writing_sessions"`
	SeedPhrase      string           `json:"seed_phrase"`
}

type PrivyUser struct {
	ID               string          `json:"id"`
	CreatedAt        int64           `json:"created_at"`
	LinkedAccounts   []LinkedAccount `json:"linked_accounts"`
	HasAcceptedTerms bool            `json:"has_accepted_terms"`
	IsGuest          bool            `json:"is_guest"`
}

type LinkedAccount struct {
	Type              string `json:"type"`
	Address           string `json:"address,omitempty"`
	ChainType         string `json:"chain_type,omitempty"`
	FID               int    `json:"fid,omitempty"`
	OwnerAddress      string `json:"owner_address,omitempty"`
	Username          string `json:"username,omitempty"`
	DisplayName       string `json:"display_name,omitempty"`
	Bio               string `json:"bio,omitempty"`
	ProfilePicture    string `json:"profile_picture,omitempty"`
	ProfilePictureURL string `json:"profile_picture_url,omitempty"`
	VerifiedAt        int64  `json:"verified_at"`
	FirstVerifiedAt   int64  `json:"first_verified_at"`
	LatestVerifiedAt  int64  `json:"latest_verified_at"`
}
