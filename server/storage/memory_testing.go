package storage

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/ankylat/anky/server/types"
	"github.com/google/uuid"
)

// MemoryTestStorage implements Storage interface for testing
type MemoryTestStorage struct {
	mu         sync.RWMutex
	users      map[uuid.UUID]*types.User
	privyUsers map[string]*types.PrivyUser
	accounts   map[string][]*types.LinkedAccount // Changed to map by privyID
	sessions   map[uuid.UUID]*types.WritingSession
	ankys      map[uuid.UUID]*types.Anky
	badges     map[uuid.UUID]*types.Badge
}

// NewMemoryTestStorage creates a new test storage instance
func NewMemoryTestStorage() *MemoryTestStorage {
	return &MemoryTestStorage{
		users:      make(map[uuid.UUID]*types.User),
		privyUsers: make(map[string]*types.PrivyUser),
		accounts:   make(map[string][]*types.LinkedAccount),
		sessions:   make(map[uuid.UUID]*types.WritingSession),
		ankys:      make(map[uuid.UUID]*types.Anky),
		badges:     make(map[uuid.UUID]*types.Badge),
	}
}

// CreateUser implements Storage interface for testing
func (s *MemoryTestStorage) CreateUser(ctx context.Context, user *types.User) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}

	s.users[user.ID] = user
	return nil
}

// GetUserByID implements Storage interface for testing
func (s *MemoryTestStorage) GetUserByID(ctx context.Context, userID uuid.UUID) (*types.User, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	user, exists := s.users[userID]
	if !exists {
		return nil, fmt.Errorf("user not found")
	}
	return user, nil
}

// CreateWritingSession implements Storage interface for testing
func (s *MemoryTestStorage) CreateWritingSession(ctx context.Context, session *types.WritingSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if session.ID == uuid.Nil {
		session.ID = uuid.New()
	}

	s.sessions[session.ID] = session
	return nil
}

// UpdateWritingSession implements Storage interface for testing
func (s *MemoryTestStorage) UpdateWritingSession(ctx context.Context, session *types.WritingSession) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, exists := s.sessions[session.ID]; !exists {
		return fmt.Errorf("writing session not found")
	}

	s.sessions[session.ID] = session
	return nil
}

// GetWritingSessionById implements Storage interface for testing
func (s *MemoryTestStorage) GetWritingSessionById(ctx context.Context, sessionID uuid.UUID) (*types.WritingSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	session, exists := s.sessions[sessionID]
	if !exists {
		return nil, fmt.Errorf("writing session not found")
	}
	return session, nil
}

// CreateAnky implements Storage interface for testing
func (s *MemoryTestStorage) CreateAnky(ctx context.Context, anky *types.Anky) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if anky.ID == uuid.Nil {
		anky.ID = uuid.New()
	}

	if anky.CreatedAt.IsZero() {
		anky.CreatedAt = time.Now()
	}
	if anky.LastUpdatedAt.IsZero() {
		anky.LastUpdatedAt = time.Now()
	}

	s.ankys[anky.ID] = anky
	return nil
}

// GetAnkyByID implements Storage interface for testing
func (s *MemoryTestStorage) GetAnkyByID(ctx context.Context, ankyID uuid.UUID) (*types.Anky, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	anky, exists := s.ankys[ankyID]
	if !exists {
		return nil, fmt.Errorf("anky not found")
	}
	return anky, nil
}

// GetUserWritingSessions implements Storage interface for testing
func (s *MemoryTestStorage) GetUserWritingSessions(ctx context.Context, userID uuid.UUID, onlyCompleted bool, limit int, offset int) ([]*types.WritingSession, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var sessions []*types.WritingSession
	for _, session := range s.sessions {
		if session.UserID == userID {
			if !onlyCompleted || session.Status == "completed" {
				sessions = append(sessions, session)
			}
		}
	}

	// Apply limit and offset
	if offset >= len(sessions) {
		return []*types.WritingSession{}, nil
	}

	end := offset + limit
	if end > len(sessions) {
		end = len(sessions)
	}

	return sessions[offset:end], nil
}

// GetAnkysByUserID implements Storage interface for testing
func (s *MemoryTestStorage) GetAnkysByUserID(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*types.Anky, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var ankys []*types.Anky
	for _, anky := range s.ankys {
		if anky.UserID == userID {
			ankys = append(ankys, anky)
		}
	}

	// Apply limit and offset
	if offset >= len(ankys) {
		return []*types.Anky{}, nil
	}

	end := offset + limit
	if end > len(ankys) {
		end = len(ankys)
	}

	return ankys[offset:end], nil
}
