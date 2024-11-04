package old_code

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/ankylat/anky/server/types"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Database struct {
	Pool *pgxpool.Pool
}

func NewDatabase() (*Database, error) {
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		return nil, fmt.Errorf("DATABASE_URL is not set")
	}

	pool, err := pgxpool.Connect(context.Background(), connString)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return &Database{Pool: pool}, nil
}

func (db *Database) Close() {
	if db.Pool != nil {
		db.Pool.Close()
	}
}

// CreateWritingSession saves a new writing session to the database
func (db *Database) CreateWritingSession(ctx context.Context, ws *types.WritingSession) error {
	query := `
        INSERT INTO writing_sessions (
            id, user_id, session_index_for_user, writing, words_written, 
            time_spent, starting_timestamp, is_anky, newen_earned,
            prompt, parent_anky_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `

	_, err := db.Pool.Exec(ctx, query,
		ws.ID,
		ws.UserID,
		ws.SessionIndexForUser,
		ws.Writing,
		ws.WordsWritten,
		ws.TimeSpent,
		ws.StartingTimestamp,
		ws.IsAnky,
		ws.NewenEarned,
		ws.Prompt,
		ws.ParentAnkyID,
		ws.Status,
	)

	return err
}

// GetWritingSession retrieves a writing session by ID
func (db *Database) GetWritingSession(ctx context.Context, sessionID string) (*types.WritingSession, error) {
	query := `
        SELECT 
            ws.*,
            a.id as anky_id,
            a.anky_reflection,
            a.image_prompt,
            a.follow_up_prompts,
            a.image_url,
            a.cast_hash,
            a.created_at as anky_created_at,
            a.last_updated_at as anky_updated_at,
            a.previous_anky_id
        FROM writing_sessions ws
        LEFT JOIN ankys a ON ws.id = a.writing_session_id
        WHERE ws.id = $1
    `

	var ws types.WritingSession
	var anky types.Anky

	err := db.Pool.QueryRow(ctx, query, sessionID).Scan(
		&ws.ID, &ws.UserID, &ws.SessionIndexForUser, &ws.Writing, &ws.WordsWritten,
		&ws.TimeSpent, &ws.StartingTimestamp, &ws.EndingTimestamp, &ws.IsAnky, &ws.NewenEarned,
		&ws.Prompt, &ws.ParentAnkyID, &ws.AnkyResponse, &ws.Status,
		&anky.ID, &anky.AnkyReflection, &anky.ImagePrompt,
		&anky.FollowUpPrompts, &anky.ImageURL, &anky.CastHash,
		&anky.CreatedAt, &anky.LastUpdatedAt, &anky.PreviousAnkyID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get writing session: %w", err)
	}

	return &ws, nil
}

// UpdateWritingSession updates an existing writing session in the database
func (db *Database) UpdateWritingSession(ctx context.Context, ws *types.WritingSession) error {
	query := `
        UPDATE writing_sessions SET
            writing = $1,
            words_written = $2,
            time_spent = $3,
            is_anky = $4,
            newen_earned = $5,
            prompt = $6,
            parent_anky_id = $7,
            anky_response = $8,
            status = $9,
            ending_timestamp = $10,
            session_index_for_user = $11
        WHERE id = $12
    `

	_, err := db.Pool.Exec(ctx, query,
		ws.Writing,
		ws.WordsWritten,
		ws.TimeSpent,
		ws.IsAnky,
		ws.NewenEarned,
		ws.Prompt,
		ws.ParentAnkyID,
		ws.AnkyResponse,
		ws.Status,
		ws.EndingTimestamp,
		ws.SessionIndexForUser,
		ws.ID,
	)

	if err != nil {
		return fmt.Errorf("failed to update writing session: %w", err)
	}

	return nil
}

func (db *Database) GetRecentValidAnkys(ctx context.Context) ([]types.WritingSession, error) {
	query := `
		SELECT 
			id, user_id, session_index_for_user, writing, words_written, time_spent, 
			starting_timestamp, ending_timestamp, is_anky, newen_earned, prompt,
			parent_anky_id, anky_response, status,
			anky
		FROM writing_sessions 
		WHERE time_spent >= 480 AND is_anky = true
		ORDER BY starting_timestamp DESC
		LIMIT 20
	`

	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent valid ankys: %w", err)
	}
	defer rows.Close()

	var sessions []types.WritingSession
	for rows.Next() {
		var ws types.WritingSession
		var ankyJSON []byte

		err := rows.Scan(
			&ws.ID, &ws.UserID, &ws.SessionIndexForUser, &ws.Writing, &ws.WordsWritten, &ws.TimeSpent,
			&ws.StartingTimestamp, &ws.EndingTimestamp, &ws.IsAnky, &ws.NewenEarned, &ws.Prompt,
			&ws.ParentAnkyID, &ws.AnkyResponse, &ws.Status,
			&ankyJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan writing session: %w", err)
		}

		if ankyJSON != nil {
			var anky types.Anky
			if err := json.Unmarshal(ankyJSON, &anky); err != nil {
				return nil, fmt.Errorf("failed to unmarshal anky data: %w", err)
			}
			ws.Anky = &anky
		}

		sessions = append(sessions, ws)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating over rows: %w", err)
	}

	return sessions, nil
}
