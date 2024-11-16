package services

import (
	"fmt"
	"time"

	"github.com/ankylat/anky/server/storage"
)

// NewenServiceInterface defines the contract for Newen-related operations
type NewenServiceInterface interface {
	CalculateNewenEarned(userID string, isValidAnky bool) int
	ProcessTransaction(userID string, walletAddress string, amount int) (bool, error)
	GetUserBalance(userID string) (int, error)
	UpdateUserBalance(userID string, newBalance int) error
	GetUserTransactions(userID string) ([]NewenTransaction, error)
}

type NewenService struct {
	store            *storage.PostgresStore
	fixedNewenReward int
	userLastWrite    map[string]time.Time
}

type NewenTransaction struct {
	Hash      string    `json:"hash"`
	Amount    int       `json:"amount"`
	Timestamp time.Time `json:"timestamp"`
	Details   string    `json:"details"`
}

func NewNewenService(store *storage.PostgresStore) (*NewenService, error) {
	return &NewenService{
		store:            store,
		fixedNewenReward: 2675,
		userLastWrite:    make(map[string]time.Time),
	}, nil
}

func (s *NewenService) CalculateNewenEarned(userID string, isValidAnky bool) int {
	if !isValidAnky {
		return 0
	}

	newenEarned := s.fixedNewenReward

	// Update last write time
	s.userLastWrite[userID] = time.Now()

	return newenEarned
}

func (s *NewenService) ProcessTransaction(userID string, walletAddress string, amount int) (bool, error) {
	userBalance, err := s.GetUserBalance(userID)
	if err != nil {
		return false, fmt.Errorf("error getting user balance: %v", err)
	}

	if userBalance < amount {
		return false, fmt.Errorf("insufficient balance")
	}

	// Update user balance
	if err := s.UpdateUserBalance(userID, userBalance-amount); err != nil {
		return false, fmt.Errorf("error updating user balance: %v", err)
	}

	return true, nil
}

func (s *NewenService) GetUserBalance(userID string) (int, error) {
	// TODO: Implement logic to fetch user balance from database using store
	return 0, nil
}

func (s *NewenService) UpdateUserBalance(userID string, newBalance int) error {
	// TODO: Implement logic to update user balance in database using store
	return nil
}

func (s *NewenService) GetUserTransactions(userID string) ([]NewenTransaction, error) {
	// TODO: Replace with actual database query using store
	fmt.Printf("Fetching transactions for user: %s\n", userID)

	now := time.Now()
	transactions := []NewenTransaction{
		{
			Hash:      "0x7d3c8f6e9a2b1d4e5c8f7a9b3d2e1f4c5d6e8a7b",
			Amount:    2675,
			Details:   "PoW",
			Timestamp: now,
		},
		{
			Hash:      "0x2a1b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
			Amount:    2675,
			Details:   "PoW",
			Timestamp: now.AddDate(0, 0, -1),
		},
		{
			Hash:      "0xf1e2d3c4b5a6978685746352413f2e1d0c9b8a7b",
			Amount:    -200,
			Details:   "buy anky clanker",
			Timestamp: now.AddDate(0, 0, -2),
		},
	}

	return transactions, nil
}
