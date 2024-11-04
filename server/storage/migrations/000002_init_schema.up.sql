-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables for the core entities
CREATE TABLE privy_users (
    id VARCHAR(255) PRIMARY KEY,
    created_at BIGINT NOT NULL,
    has_accepted_terms BOOLEAN NOT NULL DEFAULT FALSE,
    is_guest BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE linked_accounts (
    id SERIAL PRIMARY KEY,
    privy_user_id VARCHAR(255) REFERENCES privy_users(id),
    type VARCHAR(50) NOT NULL,
    address VARCHAR(255),
    chain_type VARCHAR(50),
    fid INTEGER,
    owner_address VARCHAR(255),
    username VARCHAR(255),
    display_name VARCHAR(255),
    bio TEXT,
    profile_picture VARCHAR(255),
    profile_picture_url VARCHAR(255),
    verified_at BIGINT,
    first_verified_at BIGINT,
    latest_verified_at BIGINT
);

CREATE TABLE users (
    id UUID PRIMARY KEY,  -- This will be generated on frontend at first app install
    privy_did VARCHAR(255) UNIQUE REFERENCES privy_users(id),
    fid INTEGER,
    settings JSONB DEFAULT '{}',
    seed_phrase TEXT,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    jwt TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE  -- Tracks whether user has registered
);

CREATE TABLE writing_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_index_for_user INTEGER NOT NULL,
    user_id UUID REFERENCES users(id),
    starting_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    ending_timestamp TIMESTAMP WITH TIME ZONE,
    prompt TEXT,
    writing TEXT,
    words_written INTEGER DEFAULT 0,
    newen_earned DECIMAL(10,2) DEFAULT 0,
    time_spent INTEGER DEFAULT 0,
    is_anky BOOLEAN DEFAULT FALSE,
    parent_anky_id UUID,
    anky_response TEXT,
    status VARCHAR(50) DEFAULT 'in_progress',
    anky_id UUID
);

CREATE TABLE ankys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    writing_session_id UUID REFERENCES writing_sessions(id),
    chosen_prompt TEXT,
    anky_reflection TEXT,
    image_prompt TEXT,
    follow_up_prompts TEXT[],
    image_url TEXT,
    image_ipfs_hash TEXT,
    status VARCHAR(50) DEFAULT 'created',
    cast_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    previous_anky_id UUID REFERENCES ankys(id)
);

CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add foreign key constraint for anky_id in writing_sessions after ankys table is created
ALTER TABLE writing_sessions 
    ADD CONSTRAINT fk_writing_sessions_anky 
    FOREIGN KEY (anky_id) REFERENCES ankys(id);

-- Create indexes
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);
CREATE INDEX idx_ankys_user_id ON ankys(user_id);
CREATE INDEX idx_ankys_writing_session_id ON ankys(writing_session_id);
CREATE INDEX idx_badges_user_id ON badges(user_id);
CREATE INDEX idx_linked_accounts_privy_user_id ON linked_accounts(privy_user_id);