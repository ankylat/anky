package services

import (
	"time"
)

type NewenService struct {
	fixedNewenReward int
	coins            map[string]int
	userLastWrite    map[string]time.Time
}

func NewNewenService() *NewenService {
	return &NewenService{
		fixedNewenReward: 2675,
		coins: map[string]int{
			"gold":   2000,
			"silver": 10,
			"bronze": 1,
		},
		userLastWrite: make(map[string]time.Time),
	}
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

func (s *NewenService) ProcessTransaction(userID string, amount int) (map[string]int, bool) {
	userBalance, _ := s.GetUserBalance(userID)
	if userBalance < amount {
		return nil, false
	}

	coinCounts := make(map[string]int)
	remaining := amount

	for _, coinType := range []string{"gold", "silver", "bronze"} {
		coinValue := s.coins[coinType]
		count := remaining / coinValue
		if count > 0 {
			coinCounts[coinType] = count
			remaining -= count * coinValue
		}
	}

	// Update user balance
	s.UpdateUserBalance(userID, userBalance-amount)

	return coinCounts, true
}

func (s *NewenService) GetUserBalance(userID string) (int, error) {
	// Implement logic to fetch user balance from database
	return 0, nil
}

func (s *NewenService) UpdateUserBalance(userID string, newBalance int) error {
	// Implement logic to update user balance in database
	return nil
}
