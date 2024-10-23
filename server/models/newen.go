package models

import (
	"time"
)

// NewenTransaction represents a transaction of $newen currency
type NewenTransaction struct {
	ID            string    `json:"id" bson:"id"`
	FromUserID    string    `json:"from_user_id" bson:"from_user_id"`
	ToUserID      string    `json:"to_user_id" bson:"to_user_id"`
	Amount        int64     `json:"amount" bson:"amount"` // Amount in $newen (smallest unit)
	Type          string    `json:"type" bson:"type"`     // "user_to_user", "system_to_user", "user_to_system"
	Description   string    `json:"description" bson:"description"`
	Timestamp     time.Time `json:"timestamp" bson:"timestamp"`
}

// NewenBalance represents a user's balance of $newen and its constituent coins
type NewenBalance struct {
	UserID    string    `json:"user_id" bson:"user_id"`
	Total     int64     `json:"total" bson:"total"`         // Total balance in $newen (smallest unit)
	Aether    int64     `json:"aether" bson:"aether"`       // Number of Aether coins (1000 $newen each)
	Lumina    int64     `json:"lumina" bson:"lumina"`       // Number of Lumina coins (100 $newen each)
	Terra     int64     `json:"terra" bson:"terra"`         // Number of Terra coins (25 $newen each)
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

// NewenCoin represents the different types of coins in the Ankyverse
type NewenCoin struct {
	Name   string `json:"name" bson:"name"`
	Value  int64  `json:"value" bson:"value"` // Value in $newen (smallest unit)
	Symbol string `json:"symbol" bson:"symbol"`
}

// PredefinedCoins is a slice of the three coin types in the Ankyverse
var PredefinedCoins = []NewenCoin{
	{Name: "Aether", Value: 1000, Symbol: "AE"},
	{Name: "Lumina", Value: 100, Symbol: "LU"},
	{Name: "Terra", Value: 25, Symbol: "TE"},
}

// SystemAccount represents the system's account for handling transactions
type SystemAccount struct {
	ID      string `json:"id" bson:"id"`
	Balance int64  `json:"balance" bson:"balance"` // Total balance in $newen (smallest unit)
}
