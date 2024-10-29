CREATE TABLE writing_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    words_written INTEGER NOT NULL,
    time_spent INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_anky BOOLEAN NOT NULL DEFAULT FALSE,
    newen_earned DECIMAL(10,2) NOT NULL DEFAULT 0,
    daily_session_number INTEGER NOT NULL,
    prompt TEXT,
    fid INTEGER,
    
    -- Threading component
    parent_anky_id VARCHAR(255),
    anky_response TEXT,
    
    chosen_self_inquiry_question TEXT,
    
    -- NFT-related fields
    token_id VARCHAR(255),
    contract_address VARCHAR(255),
    image_ipfs_hash VARCHAR(255),
    image_url TEXT,
    
    -- Status handling
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Metadata timestamps
    ai_processed_at TIMESTAMPTZ,
    nft_minted_at TIMESTAMPTZ,
    blockchain_synced_at TIMESTAMPTZ,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ankys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    writing_session_id UUID NOT NULL REFERENCES writing_sessions(session_id),
    reflection TEXT,
    image_prompt TEXT,
    follow_up_prompts TEXT[],  -- PostgreSQL array type for string array
    image_url TEXT,
    cast_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    parent_session_id VARCHAR(255)
);

-- Add some BLAZINGLY FAST indexes
CREATE INDEX idx_writing_sessions_user_id ON writing_sessions(user_id);
CREATE INDEX idx_writing_sessions_fid ON writing_sessions(fid);
CREATE INDEX idx_writing_sessions_status ON writing_sessions(status);
CREATE INDEX idx_ankys_writing_session_id ON ankys(writing_session_id);