-- Drop indexes first
DROP INDEX IF EXISTS idx_users_fid;
DROP INDEX IF EXISTS idx_users_privy_did;
DROP INDEX IF EXISTS idx_ankys_writing_session_id;
DROP INDEX IF EXISTS idx_writing_sessions_user_id;

-- Drop tables in reverse order of creation to handle dependencies
DROP TABLE IF EXISTS ankys;
DROP TABLE IF EXISTS writing_sessions;
DROP TABLE IF EXISTS users;