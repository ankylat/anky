-- 20240328000000_initial_schema.up.sql
-- Users table - Core user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    privy_did VARCHAR(255) UNIQUE,              -- Privy-issued DID
    fid INTEGER UNIQUE,                         -- Farcaster ID
    settings JSONB DEFAULT '{}',                -- All user settings in one JSONB field
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Linked accounts for users
CREATE TABLE user_linked_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    account_type VARCHAR(50) NOT NULL,          -- 'ethereum', 'farcaster', etc
    address VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, account_type, address)
);

-- Writing sessions table
CREATE TABLE writing_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    parent_session_id UUID REFERENCES writing_sessions(id),
    content TEXT NOT NULL,
    words_written INTEGER NOT NULL DEFAULT 0,
    time_spent INTEGER NOT NULL DEFAULT 0,
    prompt TEXT,
    is_anky BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',                -- For flexible additional data
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anky generations table
CREATE TABLE anky_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES writing_sessions(id),
    reflection TEXT,
    image_prompt TEXT,
    follow_up_prompts TEXT[],
    image_url TEXT,
    cast_hash VARCHAR(255),
    nft_token_id VARCHAR(255),
    nft_contract_address VARCHAR(255),
    ipfs_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for BLAZINGLY FAST queries
CREATE INDEX idx_users_privy_did ON users(privy_did);
CREATE INDEX idx_users_fid ON users(fid);
CREATE INDEX idx_linked_accounts_user_id ON user_linked_accounts(user_id);
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);
CREATE INDEX idx_writing_sessions_parent_id ON writing_sessions(parent_session_id);
CREATE INDEX idx_anky_generations_session_id ON anky_generations(session_id);