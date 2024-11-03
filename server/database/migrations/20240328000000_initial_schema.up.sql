-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    privy_did TEXT NOT NULL,
    fid INTEGER,
    seed_phrase TEXT NOT NULL,
    wallet_address TEXT NOT NULL, 
    jwt TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Writing sessions table
CREATE TABLE writing_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    session_index_for_user INTEGER NOT NULL,
    writing TEXT,
    words_written INTEGER,
    time_spent INTEGER,
    starting_timestamp TIMESTAMP,
    ending_timestamp TIMESTAMP,
    is_anky BOOLEAN,
    newen_earned INTEGER,
    prompt TEXT,
    parent_anky_id VARCHAR(255),
    anky_response TEXT,
    status VARCHAR(50) NOT NULL
);

-- Ankys table
CREATE TABLE ankys (
    id VARCHAR(255) PRIMARY KEY,
    writing_session_id VARCHAR(255) NOT NULL REFERENCES writing_sessions(id),
    chosen_prompt TEXT,
    anky_reflection TEXT,
    image_prompt TEXT,
    follow_up_prompts TEXT[],
    image_url TEXT,
    image_ipfs_hash TEXT,
    cast_hash VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    previous_anky_id VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);
CREATE INDEX idx_ankys_writing_session_id ON ankys(writing_session_id);
CREATE INDEX idx_users_privy_did ON users(privy_did);
CREATE INDEX idx_users_fid ON users(fid);