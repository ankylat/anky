-- Drop indexes first
DROP INDEX IF EXISTS idx_linked_accounts_privy_user_id;
DROP INDEX IF EXISTS idx_badges_user_id;
DROP INDEX IF EXISTS idx_ankys_writing_session_id;
DROP INDEX IF EXISTS idx_ankys_user_id;
DROP INDEX IF EXISTS idx_writing_sessions_user_id;

-- Remove foreign key constraint
ALTER TABLE writing_sessions DROP CONSTRAINT IF EXISTS fk_writing_sessions_anky;

-- Drop tables in reverse order of creation (due to dependencies)
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS ankys CASCADE;
DROP TABLE IF EXISTS writing_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS linked_accounts CASCADE;
DROP TABLE IF EXISTS privy_users CASCADE;