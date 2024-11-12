package storage

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/ankylat/anky/server/types"
	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
	_ "github.com/lib/pq"
)

// Storage interface defines all database operations
type Storage interface {
	// User operations
	GetUsers(ctx context.Context) ([]*types.User, error)
	GetUserByID(ctx context.Context, userID uuid.UUID) (*types.User, error)
	CreateUser(ctx context.Context, user *types.User) error
	UpdateUser(ctx context.Context, userID uuid.UUID, user *types.User) error
	DeleteUser(ctx context.Context, userID uuid.UUID) error

	// Privy user operations
	CreatePrivyUser(ctx context.Context, user *types.PrivyUser) error

	// Writing session operations
	CreateWritingSession(ctx context.Context, session *types.WritingSession) error
	GetWritingSessionById(ctx context.Context, sessionID uuid.UUID) (*types.WritingSession, error)
	UpdateWritingSession(ctx context.Context, session *types.WritingSession) error
	GetUserWritingSessions(ctx context.Context, userID uuid.UUID, onlyAnkys bool, limit int, offset int) ([]*types.WritingSession, error)

	// Anky operations
	GetAnkys(ctx context.Context, limit int, offset int) ([]*types.Anky, error)
	CreateAnky(ctx context.Context, anky *types.Anky) error
	UpdateAnky(ctx context.Context, anky *types.Anky) error
	GetAnkyByID(ctx context.Context, ankyID uuid.UUID) (*types.Anky, error)
	GetAnkysByUserID(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*types.Anky, error)

	// Badge operations
	GetUserBadges(ctx context.Context, userID uuid.UUID) ([]*types.Badge, error)
}

type PostgresStore struct {
	db *pgxpool.Pool
}

func NewPostgresStore() (*PostgresStore, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	// Connect to database
	db, err := pgxpool.Connect(context.Background(), connStr)
	if err != nil {
		return nil, fmt.Errorf("error connecting to database: %w", err)
	}

	// Run migrations
	if err := runMigrations(connStr); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return &PostgresStore{db: db}, nil
}

func runMigrations(connStr string) error {
	m, err := migrate.New(
		"file://storage/migrations",
		connStr,
	)
	if err != nil {
		return fmt.Errorf("failed to create migrate instance: %w", err)
	}
	defer m.Close()

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// ******************** User operations ********************

func (s *PostgresStore) GetUsers(ctx context.Context, limit int, offset int) ([]*types.User, error) {
	query := `
        SELECT id, privy_did, fid, settings, seed_phrase, wallet_address, jwt, created_at, updated_at 
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `
	rows, err := s.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get users: %w", err)
	}
	defer rows.Close()

	users := make([]*types.User, 0, limit) // Pre-allocate slice with capacity
	for rows.Next() {
		user, err := scanIntoUser(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, user)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over rows: %w", err)
	}

	return users, nil
}

func (s *PostgresStore) GetUserByID(ctx context.Context, userID uuid.UUID) (*types.User, error) {
	query := `SELECT * FROM users WHERE id = $1`
	row := s.db.QueryRow(ctx, query, userID)
	return scanIntoUser(row)
}

func (s *PostgresStore) CreateUser(ctx context.Context, user *types.User) error {
	query := `
		INSERT INTO users (id, privy_did, fid, settings, seed_phrase, wallet_address, jwt, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := s.db.Exec(ctx, query,
		user.ID,
		user.PrivyDID,
		user.FID,
		user.Settings,
		user.SeedPhrase,
		user.WalletAddress,
		user.JWT,
		user.CreatedAt,
		user.UpdatedAt,
	)
	return err
}

func (s *PostgresStore) UpdateUser(ctx context.Context, userID uuid.UUID, user *types.User) error {
	query := `
		UPDATE users 
		SET privy_did = $1, fid = $2, settings = $3, seed_phrase = $4, 
			wallet_address = $5, jwt = $6, updated_at = CURRENT_TIMESTAMP 
		WHERE id = $7
	`
	_, err := s.db.Exec(ctx, query,
		user.PrivyDID,
		user.FID,
		user.Settings,
		user.SeedPhrase,
		user.WalletAddress,
		user.JWT,
		userID,
	)
	return err
}

func (s *PostgresStore) DeleteUser(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := s.db.Exec(ctx, query, userID)
	return err
}

// ******************** Privy user operations ********************

func (s *PostgresStore) CreatePrivyUser(ctx context.Context, user *types.PrivyUser) error {
	query := `INSERT INTO privy_users (did, user_id, created_at) VALUES ($1, $2, $3)`
	_, err := s.db.Exec(ctx, query, user.DID, user.UserID, user.CreatedAt)
	return err
}

// ******************** Writing session operations ********************
func (s *PostgresStore) CreateWritingSession(ctx context.Context, ws *types.WritingSession) error {
	query := `
        INSERT INTO writing_sessions (
            id, user_id, session_index_for_user, starting_timestamp,
            prompt, status, writing, words_written, newen_earned,
            time_spent, is_anky, parent_anky_id, anky_response, is_onboarding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `

	_, err := s.db.Exec(ctx, query,
		ws.ID,
		ws.UserID,
		ws.SessionIndexForUser,
		ws.StartingTimestamp,
		ws.Prompt,
		ws.Status,
		ws.Writing,
		ws.WordsWritten,
		ws.NewenEarned,
		ws.TimeSpent,
		ws.IsAnky,
		ws.ParentAnkyID, // Directly use the UUID pointer
		ws.AnkyResponse,
		ws.IsOnboarding,
	)
	return err
}

func (s *PostgresStore) GetWritingSessionById(ctx context.Context, sessionID uuid.UUID) (*types.WritingSession, error) {
	query := `SELECT * FROM writing_sessions WHERE id = $1`
	row := s.db.QueryRow(ctx, query, sessionID)
	return scanIntoWritingSession(row)
}

func (s *PostgresStore) GetUserWritingSessions(ctx context.Context, userID uuid.UUID, onlyAnkys bool, limit int, offset int) ([]*types.WritingSession, error) {
	var query string
	var args []interface{}

	args = append(args, userID)
	query = `SELECT * FROM writing_sessions WHERE user_id = $1`

	if onlyAnkys {
		query += ` AND is_anky = true`
	}

	query += ` ORDER BY starting_timestamp DESC LIMIT $2 OFFSET $3`
	args = append(args, limit, offset)

	rows, err := s.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get user writing sessions: %w", err)
	}
	defer rows.Close()

	writingSessions := make([]*types.WritingSession, 0)
	for rows.Next() {
		writingSession, err := scanIntoWritingSession(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan writing session: %w", err)
		}
		writingSessions = append(writingSessions, writingSession)
	}

	return writingSessions, nil
}

func (s *PostgresStore) UpdateWritingSession(ctx context.Context, ws *types.WritingSession) error {
	query := `
		UPDATE writing_sessions SET 
			status = $1,
			writing = $2,
			words_written = $3,
			time_spent = $4,
			ending_timestamp = $5,
			is_anky = $6,
			newen_earned = $7,
			parent_anky_id = $8,
			anky_response = $9,
			is_onboarding = $10,
			anky_id = $11
		WHERE id = $12
	`
	_, err := s.db.Exec(ctx, query,
		ws.Status,
		ws.Writing,
		ws.WordsWritten,
		ws.TimeSpent,
		ws.EndingTimestamp,
		ws.IsAnky,
		ws.NewenEarned,
		ws.ParentAnkyID,
		ws.AnkyResponse,
		ws.IsOnboarding,
		ws.AnkyID,
		ws.ID,
	)
	return err
}

// ******************** Anky operations ********************

func (s *PostgresStore) GetAnkys(ctx context.Context, limit int, offset int) ([]*types.Anky, error) {
	query := `SELECT * FROM ankys ORDER BY created_at DESC LIMIT $1 OFFSET $2`
	rows, err := s.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get ankys: %w", err)
	}
	defer rows.Close()

	ankys := make([]*types.Anky, 0)
	for rows.Next() {
		anky, err := scanIntoAnky(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan anky: %w", err)
		}
		ankys = append(ankys, anky)
	}

	return ankys, nil
}

func (s *PostgresStore) GetAnkyByID(ctx context.Context, ankyID uuid.UUID) (*types.Anky, error) {
	query := `SELECT * FROM ankys WHERE id = $1`
	row := s.db.QueryRow(ctx, query, ankyID)
	return scanIntoAnky(row)
}

func (s *PostgresStore) GetAnkysByUserID(ctx context.Context, userID uuid.UUID, limit int, offset int) ([]*types.Anky, error) {
	query := `SELECT * FROM ankys WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	rows, err := s.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get ankys by user ID: %w", err)
	}
	defer rows.Close()

	ankys := make([]*types.Anky, 0)
	for rows.Next() {
		anky, err := scanIntoAnky(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan anky: %w", err)
		}
		ankys = append(ankys, anky)
	}

	return ankys, nil
}

func (s *PostgresStore) CreateAnky(ctx context.Context, anky *types.Anky) error {
	// Add debug logging
	log.Printf("Creating Anky with ID: %s, UserID: %s, WritingSessionID: %s",
		anky.ID, anky.UserID, anky.WritingSessionID)

	query := `
        INSERT INTO ankys (
            id, user_id, writing_session_id, chosen_prompt, 
            anky_reflection, image_prompt, follow_up_prompt, 
            image_url, image_ipfs_hash, status, cast_hash, 
            created_at, last_updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `

	// Initialize LastUpdatedAt if it's zero
	if anky.LastUpdatedAt.IsZero() {
		anky.LastUpdatedAt = time.Now().UTC()
	}

	_, err := s.db.Exec(ctx, query,
		anky.ID,               // $1
		anky.UserID,           // $2
		anky.WritingSessionID, // $3
		anky.ChosenPrompt,     // $4
		anky.AnkyReflection,   // $5
		anky.ImagePrompt,      // $6
		anky.FollowUpPrompt,   // $7
		anky.ImageURL,         // $8
		anky.ImageIPFSHash,    // $9
		anky.Status,           // $10
		anky.CastHash,         // $11
		anky.CreatedAt,        // $12
		anky.LastUpdatedAt,    // $13
	)

	if err != nil {
		return fmt.Errorf("failed to create anky: %w", err)
	}

	return nil
}

func (s *PostgresStore) UpdateAnky(ctx context.Context, anky *types.Anky) error {
	query := `
		UPDATE ankys SET 
			user_id = $1,
			writing_session_id = $2,
			chosen_prompt = $3,
			anky_reflection = $4,
			image_prompt = $5,
			follow_up_prompt = $6,
			image_url = $7,
			image_ipfs_hash = $8,
			status = $9,
			cast_hash = $10,
			last_updated_at = $11,
			fid = $12
		WHERE id = $13`
	_, err := s.db.Exec(ctx, query,
		anky.UserID,
		anky.WritingSessionID,
		anky.ChosenPrompt,
		anky.AnkyReflection,
		anky.ImagePrompt,

		anky.FollowUpPrompt,
		anky.ImageURL,
		anky.ImageIPFSHash,
		anky.Status,
		anky.CastHash,
		anky.LastUpdatedAt,
		anky.ID,
		anky.FID,
	)
	return err
}

func (s *PostgresStore) GetLastAnkyByUserID(ctx context.Context, userID uuid.UUID) (*types.Anky, error) {
	query := `SELECT * FROM ankys WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`
	row := s.db.QueryRow(ctx, query, userID)
	return scanIntoAnky(row)
}

// ******************** Badge operations ********************

func (s *PostgresStore) GetUserBadges(ctx context.Context, userID uuid.UUID) ([]*types.Badge, error) {
	query := `SELECT * FROM badges WHERE user_id = $1`
	rows, err := s.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user badges: %w", err)
	}
	defer rows.Close()

	badges := make([]*types.Badge, 0)
	for rows.Next() {
		badge, err := scanIntoBadge(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan badge: %w", err)
		}
		badges = append(badges, badge)
	}

	return badges, nil
}

// ******************** Scan functions ********************
// Scan functions are essential utilities that map database query results into Go structs.
// They handle the conversion of raw database rows into strongly-typed application objects,
// providing type safety and reducing boilerplate code throughout the codebase.

func scanIntoUser(row pgx.Row) (*types.User, error) {
	user := new(types.User)
	err := row.Scan(
		&user.ID,
		&user.PrivyDID,
		&user.FID,
		&user.Settings,
		&user.SeedPhrase,
		&user.WalletAddress,
		&user.JWT,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan user: %w", err)
	}
	return user, nil
}

func scanIntoWritingSession(row pgx.Row) (*types.WritingSession, error) {
	ws := new(types.WritingSession)
	var endingTimestamp *time.Time
	var parentAnkyID *uuid.UUID
	var ankyResponse *string
	var ankyID *uuid.UUID

	err := row.Scan(
		&ws.ID,
		&ws.SessionIndexForUser,
		&ws.UserID,
		&ws.StartingTimestamp,
		&endingTimestamp,
		&ws.Prompt,
		&ws.Writing,
		&ws.WordsWritten,
		&ws.NewenEarned,
		&ws.TimeSpent,
		&ws.IsAnky,
		&parentAnkyID,
		&ankyResponse,
		&ws.Status,
		&ankyID,
		&ws.IsOnboarding,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan writing session: %w", err)
	}

	// Handle nullable fields
	if endingTimestamp != nil {
		ws.EndingTimestamp = endingTimestamp
	}

	// Direct assignment of UUID pointers
	ws.ParentAnkyID = parentAnkyID
	ws.AnkyResponse = ankyResponse
	ws.AnkyID = ankyID

	return ws, nil
}

func scanIntoAnky(row pgx.Row) (*types.Anky, error) {
	anky := new(types.Anky)
	err := row.Scan(
		&anky.ID,
		&anky.UserID,
		&anky.WritingSessionID,
		&anky.ChosenPrompt,
		&anky.AnkyReflection,
		&anky.ImagePrompt,
		&anky.FollowUpPrompt,
		&anky.ImageURL,
		&anky.ImageIPFSHash,
		&anky.Status,
		&anky.CastHash,
		&anky.CreatedAt,
		&anky.LastUpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan anky: %w", err)
	}
	return anky, nil
}

func scanIntoBadge(row pgx.Row) (*types.Badge, error) {
	badge := new(types.Badge)
	err := row.Scan(
		&badge.ID,
		&badge.UserID,
		&badge.Name,
		&badge.Description,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to scan badge: %w", err)
	}
	return badge, nil
}
