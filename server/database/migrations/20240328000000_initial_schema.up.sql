-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    privy_did VARCHAR(255) NOT NULL,
    fid INTEGER,
    settings JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    seed_phrase TEXT
);

-- Writing sessions table
CREATE TABLE writing_sessions (
    id VARCHAR(255) PRIMARY KEY,                -- SessionID
    user_id VARCHAR(255) NOT NULL,              -- UserID
    session_index_for_user INTEGER NOT NULL,    -- SessionIndexForUser
    content TEXT NOT NULL,                      -- Content
    words_written INTEGER NOT NULL,             -- WordsWritten
    time_spent INTEGER NOT NULL,                -- TimeSpent
    timestamp TIMESTAMPTZ NOT NULL,             -- Timestamp
    is_anky BOOLEAN NOT NULL,                   -- IsAnky
    newen_earned DECIMAL,                       -- NewenEarned
    daily_session_number INTEGER,               -- DailySessionNumber
    prompt TEXT,                                -- Prompt
    fid INTEGER,                                -- FID
    parent_anky_id VARCHAR(255),                -- ParentAnkyID
    anky_response TEXT,                         -- AnkyResponse
    chosen_self_inquiry_question TEXT,          -- ChosenSelfInquiryQuestion
    token_id VARCHAR(255),                      -- TokenID
    contract_address VARCHAR(255),              -- ContractAddress
    image_ipfs_hash VARCHAR(255),               -- ImageIPFSHash
    image_url TEXT,                             -- ImageURL
    status VARCHAR(50) NOT NULL,                -- Status
    ai_processed_at TIMESTAMPTZ,                -- AIProcessedAt
    nft_minted_at TIMESTAMPTZ,                  -- NFTMintedAt
    blockchain_synced_at TIMESTAMPTZ,           -- BlockchainSyncedAt
    last_updated_at TIMESTAMPTZ NOT NULL        -- LastUpdatedAt
);

-- Ankys table
CREATE TABLE ankys (
    id VARCHAR(255) PRIMARY KEY,                -- ID
    anky_index_for_user INTEGER NOT NULL,       -- AnkyIndexForUser
    writing_session_id VARCHAR(255) NOT NULL REFERENCES writing_sessions(id),
    reflection TEXT,                            -- Reflection
    image_prompt TEXT,                          -- ImagePrompt
    follow_up_prompts TEXT[],                   -- FollowUpPrompts
    image_url TEXT,                             -- ImageURL
    cast_hash VARCHAR(255),                     -- CastHash
    created_at TIMESTAMPTZ NOT NULL,            -- CreatedAt
    last_updated_at TIMESTAMPTZ NOT NULL,       -- LastUpdatedAt
    parent_session_id VARCHAR(255)              -- ParentSessionID
);

-- Newen transactions table
CREATE TABLE newen_transactions (
    id VARCHAR(255) PRIMARY KEY,
    from_user_id VARCHAR(255) NOT NULL,
    to_user_id VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    timestamp TIMESTAMPTZ NOT NULL
);

-- Newen balances table
CREATE TABLE newen_balances (
    user_id VARCHAR(255) PRIMARY KEY,
    total BIGINT NOT NULL,
    aether BIGINT NOT NULL,
    lumina BIGINT NOT NULL,
    terra BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- System accounts table
CREATE TABLE system_accounts (
    id VARCHAR(255) PRIMARY KEY,
    balance BIGINT NOT NULL
);

-- Casts table
CREATE TABLE casts (
    hash VARCHAR(255) PRIMARY KEY,
    thread_hash VARCHAR(255),
    parent_hash VARCHAR(255),
    parent_url TEXT,
    root_parent_url TEXT,
    author_fid INTEGER NOT NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    channel_id VARCHAR(255),
    reactions_likes_count INTEGER DEFAULT 0,
    reactions_recasts_count INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);
CREATE INDEX idx_writing_sessions_parent_anky_id ON writing_sessions(parent_anky_id);
CREATE INDEX idx_writing_sessions_timestamp ON writing_sessions(timestamp);
CREATE INDEX idx_ankys_writing_session_id ON ankys(writing_session_id);
CREATE INDEX idx_ankys_parent_session_id ON ankys(parent_session_id);
CREATE INDEX idx_newen_transactions_from_user ON newen_transactions(from_user_id);
CREATE INDEX idx_newen_transactions_to_user ON newen_transactions(to_user_id);
CREATE INDEX idx_casts_author_fid ON casts(author_fid);
CREATE INDEX idx_casts_thread_hash ON casts(thread_hash);
CREATE INDEX idx_users_privy_did ON users(privy_did);
CREATE INDEX idx_users_fid ON users(fid);