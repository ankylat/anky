package database

import (
	"database/sql"
	"fmt"
	"os"

	"github.com/ankylat/anky/server/models"
	"github.com/google/uuid"

	_ "github.com/lib/pq"
)

type Storage interface {
	CreateUser(user *models.User) error
	CreateWritingSession(writingSession *models.WritingSession) error
	DeleteUser(userID uuid.UUID) error
	UpdateUser(userID uuid.UUID) error
	GetUserById(userID uuid.UUID) (*models.User, error)
	GetUsers() ([]*models.User, error)
	GetRecentValidAnkys() ([]*models.Anky, error)
	GetUserAnkys(userID uuid.UUID) ([]*models.Anky, error)
	GetUserWritingSessions(userID uuid.UUID) ([]*models.WritingSession, error)
	GetWritingSessionById(sessionID string) (*models.WritingSession, error)
	UpdateWritingSession(writingSession *models.WritingSession) error
	CreateAnky(anky *models.Anky) error
	UpdateAnkyStatus(anky *models.Anky) error
	UpdateAnky(anky *models.Anky) error
}

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore() (*PostgresStore, error) {
	connStr := os.Getenv("DATABASE_URL")
	db, err := sql.Open("postgres", connStr)

	if err != nil {
		return nil, fmt.Errorf("Error opening database: %v", err)
	}

	return &PostgresStore{
		db: db,
	}, nil
}

func (s *PostgresStore) Init() error {
	return s.createUsersTable()
}

func (s *PostgresStore) createUsersTable() error {
	query := `CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY,
		privy_did TEXT NOT NULL,
		fid INTEGER,
		seed_phrase TEXT NOT NULL,
		wallet_address TEXT NOT NULL,
		jwt TEXT NOT NULL,
		created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`

	_, err := s.db.Exec(query)
	return err
}

// ************************** FUNCTIONS THAT CREATE DATA **************************

func (s *PostgresStore) CreateUser(user *models.User) error {
	query := `INSERT INTO users (id, privy_did, fid, seed_phrase, wallet_address, jwt, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`
	resp, err := s.db.Query(query, user.ID, user.PrivyDID, user.FID, user.SeedPhrase, user.WalletAddress, user.JWT, user.CreatedAt, user.UpdatedAt)

	if err != nil {
		return err
	}

	fmt.Printf("%+v\n", resp)

	return nil
}

func (s *PostgresStore) CreateWritingSession(writingSession *models.WritingSession) error {
	query := `INSERT INTO writing_session (id, session_index_for_user, user_id, starting_timestamp, prompt, status) VALUES ($1, $2, $3, $4, $5, $6)`
	_, err := s.db.Query(query, writingSession.ID, writingSession.SessionIndexForUser, writingSession.UserID, writingSession.StartingTimestamp, writingSession.Prompt, writingSession.Status)
	return err
}

func (s *PostgresStore) CreateAnky(anky *models.CreateAnkyRequest) error {
	query := `INSERT INTO anky (id, writing_session_id, chosen_prompt, created_at) VALUES ($1, $2, $3, $4)`
	_, err := s.db.Query(query, anky.ID, anky.WritingSessionID, anky.ChosenPrompt, anky.CreatedAt)
	return err
}

func (s *PostgresStore) DeleteUser(userID uuid.UUID) error {
	query := `DELETE FROM users WHERE id = $1`
	_, err := s.db.Exec(query, userID)
	return err
}

func (s *PostgresStore) UpdateUser(userID uuid.UUID) error {
	query := `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`
	_, err := s.db.Exec(query, userID)
	return err
}

func (s *PostgresStore) GetUserById(userID uuid.UUID) (*models.User, error) {
	query := `SELECT * FROM users WHERE id = $1`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		return scanIntoUser(rows)
	}

	return nil, fmt.Errorf("user not found")
}

func (s *PostgresStore) GetUsers() ([]*models.User, error) {
	query := `SELECT * FROM users`
	rows, err := s.db.Query(query)

	if err != nil {
		return nil, err
	}

	users := []*models.User{}
	for rows.Next() {
		user, err := scanIntoUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (s *PostgresStore) GetRecentAnkys() ([]*models.Anky, error) {
	query := `SELECT * FROM anky ORDER BY created_at DESC LIMIT 20`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}

	ankys := []*models.Anky{}
	for rows.Next() {
		anky, err := scanIntoAnky(rows)
		if err != nil {
			return nil, err
		}
		ankys = append(ankys, anky)
	}

	return ankys, nil
}

func (s *PostgresStore) GetUserWritingSessions(userID uuid.UUID) ([]*models.WritingSession, error) {
	query := `SELECT * FROM writing_session WHERE user_id = $1`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}

	writingSessions := []*models.WritingSession{}
	for rows.Next() {
		writingSession, err := scanIntoWritingSession(rows)
		if err != nil {
			return nil, err
		}
		writingSessions = append(writingSessions, writingSession)
	}

	return writingSessions, nil
}

func (s *PostgresStore) GetWritingSessionById(sessionID string) (*models.WritingSession, error) {
	query := `SELECT * FROM writing_session WHERE id = $1`
	rows, err := s.db.Query(query, sessionID)
	if err != nil {
		return nil, err
	}

	for rows.Next() {
		return scanIntoWritingSession(rows)
	}

	return nil, fmt.Errorf("writing session not found")
}

// ************************** FUNCTIONS THAT UPDATE ANKY **************************

func (s *PostgresStore) UpdateAnkyStatus(anky *models.Anky) error {
	query := `UPDATE anky SET status = $1 WHERE id = $2`
	_, err := s.db.Exec(query, anky.Status, anky.ID)
	return err
}

func (s *PostgresStore) UpdateAnky(anky *models.Anky) error {
	query := `UPDATE anky SET image_url = $1, image_ipfs_hash = $2, cast_hash = $3 WHERE id = $4`
	_, err := s.db.Exec(query, anky.ImageURL, anky.ImageIPFSHash, anky.CastHash, anky.ID)
	return err
}

// ************************** FUNCTIONS THAT UPDATE ANKY **************************

func (s *PostgresStore) UpdateWritingSession(writingSession *models.WritingSession) error {
	query := `UPDATE writing_session SET ending_timestamp = $1, words_written = $2, newen_earned = $3, time_spent = $4, is_anky = $5, parent_anky_id = $6, anky_response = $7, status = $8 WHERE id = $9`
	_, err := s.db.Exec(query, writingSession.EndingTimestamp, writingSession.WordsWritten, writingSession.NewenEarned, writingSession.TimeSpent, writingSession.IsAnky, writingSession.ParentAnkyID, writingSession.AnkyResponse, writingSession.Status, writingSession.ID)
	return err
}

func (s *PostgresStore) GetUserAnkys(userID uuid.UUID) ([]*models.Anky, error) {
	query := `SELECT * FROM anky WHERE user_id = $1`
	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}

	ankys := []*models.Anky{}
	for rows.Next() {
		anky, err := scanIntoAnky(rows)
		if err != nil {
			return nil, err
		}
		ankys = append(ankys, anky)
	}

	return ankys, nil
}

func scanIntoUser(rows *sql.Rows) (*models.User, error) {
	user := new(models.User)
	err := rows.Scan(
		&user.ID,
		&user.PrivyDID,
		&user.FID,
		&user.SeedPhrase,
		&user.WalletAddress,
		&user.JWT,
		&user.CreatedAt,
		&user.UpdatedAt,
	)

	return user, err
}

func scanIntoAnky(rows *sql.Rows) (*models.Anky, error) {
	anky := new(models.Anky)
	err := rows.Scan(
		&anky.ID,
		&anky.WritingSessionID,
		&anky.ChosenPrompt,
		&anky.AnkyReflection,
		&anky.ImagePrompt,
		&anky.FollowUpPrompts,
		&anky.ImageURL,
		&anky.ImageIPFSHash,
		&anky.CastHash,
		&anky.CreatedAt,
		&anky.LastUpdatedAt,
		&anky.PreviousAnkyID,
	)
	return anky, err
}

func scanIntoWritingSession(rows *sql.Rows) (*models.WritingSession, error) {
	writingSession := new(models.WritingSession)
	err := rows.Scan(
		&writingSession.ID,
		&writingSession.SessionIndexForUser,
		&writingSession.UserID,
		&writingSession.StartingTimestamp,
		&writingSession.Prompt,
		&writingSession.Status,
		&writingSession.EndingTimestamp,
		&writingSession.WordsWritten,
		&writingSession.NewenEarned,
		&writingSession.TimeSpent,
		&writingSession.IsAnky,
		&writingSession.ParentAnkyID,
		&writingSession.AnkyResponse,
	)
	return writingSession, err
}
