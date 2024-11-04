-- First, drop all tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS ankys CASCADE;
DROP TABLE IF EXISTS writing_sessions CASCADE;
DROP TABLE IF EXISTS linked_accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS privy_users CASCADE;

-- Drop any existing extensions
DROP EXTENSION IF EXISTS "uuid-ossp";