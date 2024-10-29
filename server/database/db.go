package database

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/ankylat/anky/server/models"
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
func (db *Database) CreateWritingSession(ctx context.Context, ws *models.WritingSession) error {
	query := `
        INSERT INTO writing_sessions (
            session_id, user_id, content, words_written, time_spent,
            timestamp, is_anky, newen_earned, daily_session_number,
            prompt, fid, parent_anky_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `

	_, err := db.Pool.Exec(ctx, query,
		ws.SessionID,
		ws.UserID,
		ws.Content,
		ws.WordsWritten,
		ws.TimeSpent,
		ws.Timestamp,
		ws.IsAnky,
		ws.NewenEarned,
		ws.DailySessionNumber,
		ws.Prompt,
		ws.FID,
		ws.ParentAnkyID,
		ws.Status,
	)

	return err
}

// GetWritingSession retrieves a writing session by ID
func (db *Database) GetWritingSession(ctx context.Context, sessionID string) (*models.WritingSession, error) {
	query := `
        SELECT 
            ws.*,
            a.id as anky_id,
            a.reflection,
            a.image_prompt,
            a.follow_up_prompts,
            a.image_url as anky_image_url,
            a.cast_hash,
            a.created_at as anky_created_at,
            a.last_updated_at as anky_updated_at,
            a.parent_session_id
        FROM writing_sessions ws
        LEFT JOIN ankys a ON ws.session_id = a.writing_session_id
        WHERE ws.session_id = $1
    `

	var ws models.WritingSession
	var anky models.Anky

	err := db.Pool.QueryRow(ctx, query, sessionID).Scan(
		&ws.SessionID, &ws.UserID, &ws.Content, &ws.WordsWritten,
		&ws.TimeSpent, &ws.Timestamp, &ws.IsAnky, &ws.NewenEarned,
		&ws.DailySessionNumber, &ws.Prompt, &ws.FID, &ws.ParentAnkyID,
		&ws.AnkyResponse, &ws.ChosenSelfInquiryQuestion, &ws.TokenID,
		&ws.ContractAddress, &ws.ImageIPFSHash, &ws.ImageURL,
		&ws.Status, &ws.AIProcessedAt, &ws.NFTMintedAt,
		&ws.BlockchainSyncedAt, &ws.LastUpdatedAt,
		&anky.ID, &anky.Reflection, &anky.ImagePrompt,
		&anky.FollowUpPrompts, &anky.ImageURL, &anky.CastHash,
		&anky.CreatedAt, &anky.LastUpdatedAt, &anky.ParentSessionID,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get writing session: %w", err)
	}

	if anky.ID != "" {
		ws.Anky = &anky
	}

	return &ws, nil
}

// UpdateWritingSession updates an existing writing session in the database
func (db *Database) UpdateWritingSession(ctx context.Context, ws *models.WritingSession) error {
	query := `
        UPDATE writing_sessions SET
            content = $1,
            words_written = $2,
            time_spent = $3,
            is_anky = $4,
            newen_earned = $5,
            prompt = $6,
            parent_anky_id = $7,
            anky_response = $8,
            chosen_self_inquiry_question = $9,
            token_id = $10,
            contract_address = $11,
            image_ipfs_hash = $12,
            image_url = $13,
            status = $14,
            ai_processed_at = $15,
            nft_minted_at = $16,
            blockchain_synced_at = $17,
            last_updated_at = $18
        WHERE session_id = $19
    `

	_, err := db.Pool.Exec(ctx, query,
		ws.Content,
		ws.WordsWritten,
		ws.TimeSpent,
		ws.IsAnky,
		ws.NewenEarned,
		ws.Prompt,
		ws.ParentAnkyID,
		ws.AnkyResponse,
		ws.ChosenSelfInquiryQuestion,
		ws.TokenID,
		ws.ContractAddress,
		ws.ImageIPFSHash,
		ws.ImageURL,
		ws.Status,
		ws.AIProcessedAt,
		ws.NFTMintedAt,
		ws.BlockchainSyncedAt,
		ws.LastUpdatedAt,
		ws.SessionID,
	)

	if err != nil {
		return fmt.Errorf("failed to update writing session: %w", err)
	}

	return nil
}

func (db *Database) GetRecentValidAnkys(ctx context.Context) ([]models.WritingSession, error) {
	query := `
		SELECT 
			session_id, user_id, content, words_written, time_spent, timestamp,
			is_anky, newen_earned, daily_session_number, prompt, fid,
			parent_anky_id, anky_response, chosen_self_inquiry_question,
			token_id, contract_address, image_ipfs_hash, image_url,
			status, ai_processed_at, nft_minted_at, blockchain_synced_at, last_updated_at,
			anky
		FROM writing_sessions 
		WHERE time_spent >= 480 AND is_anky = true
		ORDER BY timestamp DESC
		LIMIT 20
	`

	rows, err := db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query recent valid ankys: %w", err)
	}
	defer rows.Close()

	var sessions []models.WritingSession
	for rows.Next() {
		var ws models.WritingSession
		var ankyJSON []byte

		err := rows.Scan(
			&ws.SessionID, &ws.UserID, &ws.Content, &ws.WordsWritten, &ws.TimeSpent, &ws.Timestamp,
			&ws.IsAnky, &ws.NewenEarned, &ws.DailySessionNumber, &ws.Prompt, &ws.FID,
			&ws.ParentAnkyID, &ws.AnkyResponse, &ws.ChosenSelfInquiryQuestion,
			&ws.TokenID, &ws.ContractAddress, &ws.ImageIPFSHash, &ws.ImageURL,
			&ws.Status, &ws.AIProcessedAt, &ws.NFTMintedAt, &ws.BlockchainSyncedAt, &ws.LastUpdatedAt,
			&ankyJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan writing session: %w", err)
		}

		if ankyJSON != nil {
			var anky models.Anky
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
