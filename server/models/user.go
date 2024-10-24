package models

import (
	"time"
)

type User struct {
	ID                    string             `json:"id" bson:"id"` // Privy-issued DID for the user
	LinkedAccounts        []LinkedAccount    `json:"linked_accounts" bson:"linked_accounts"`
	WritingSessions       []WritingSession   `json:"writing_sessions" bson:"writing_sessions"`
	CollectedAnkys        []Anky             `json:"collected_ankys" bson:"collected_ankys"`
	NewenBalance          NewenBalance       `json:"newen_balance" bson:"newen_balance"`
	NewenTransactions     []NewenTransaction `json:"newen_transactions" bson:"newen_transactions"`
	ProfilePictureHistory []ProfilePicture   `json:"profile_picture_history" bson:"profile_picture_history"`
	Settings              UserSettings       `json:"settings" bson:"settings"`
	CreatedAt             time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt             time.Time          `json:"updated_at" bson:"updated_at"`
}

type LinkedAccount struct {
	Type    string `json:"type" bson:"type"`
	Address string `json:"address" bson:"address"`
}

type ProfilePicture struct {
	URL       string    `json:"url" bson:"url"`
	UpdatedAt time.Time `json:"updated_at" bson:"updated_at"`
}

type UserSettings struct {
	NotificationPreferences NotificationPreferences `json:"notification_preferences" bson:"notification_preferences"`
	PrivacySettings         PrivacySettings         `json:"privacy_settings" bson:"privacy_settings"`
}

type NotificationPreferences struct {
	EmailNotifications bool `json:"email_notifications" bson:"email_notifications"`
	SMSNotifications   bool `json:"sms_notifications" bson:"sms_notifications"`
	PushNotifications  bool `json:"push_notifications" bson:"push_notifications"`
}

type PrivacySettings struct {
	ShowEmail          bool `json:"show_email" bson:"show_email"`
	ShowPhone          bool `json:"show_phone" bson:"show_phone"`
	ShowWallet         bool `json:"show_wallet" bson:"show_wallet"`
	ShowProfilePicture bool `json:"show_profile_picture" bson:"show_profile_picture"`
}
