-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE linked_accounts (
    privy_user_id VARCHAR(255) PRIMARY KEY,
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

CREATE TABLE farcaster_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fid INTEGER NOT NULL,
    username VARCHAR(255),
    display_name VARCHAR(255),
    pfp_url VARCHAR(255),
    custody_address VARCHAR(255),
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    signer_uuid VARCHAR(255)
);

CREATE TABLE users (
    id UUID PRIMARY KEY,  
    privy_did VARCHAR(255),
    fid INTEGER,
    settings JSONB DEFAULT '{}',
    seed_phrase TEXT,
    wallet_address VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    jwt TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE,
    farcaster_user_id UUID REFERENCES farcaster_users(id)
);

CREATE TABLE user_metadata (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255),
    platform VARCHAR(100),
    device_model VARCHAR(255),
    os_version VARCHAR(100),
    app_version VARCHAR(100),
    screen_width INTEGER,
    screen_height INTEGER,
    locale VARCHAR(50),
    timezone VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    installation_source VARCHAR(100)
);

ALTER TABLE users ADD COLUMN metadata_id UUID REFERENCES user_metadata(id);

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
    anky_id UUID,
    is_onboarding BOOLEAN DEFAULT FALSE
);

CREATE TABLE ankys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    writing_session_id UUID REFERENCES writing_sessions(id),
    chosen_prompt TEXT,
    anky_reflection TEXT,
    image_prompt TEXT,
    follow_up_prompt TEXT,
    image_url TEXT,
    image_ipfs_hash TEXT,
    status VARCHAR(50) DEFAULT 'created',
    cast_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
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
CREATE INDEX idx_farcaster_users_fid ON farcaster_users(fid);