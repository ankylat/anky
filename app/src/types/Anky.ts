export interface WritingSession {
  session_id: string;
  user_id: string;
  content: string;
  words_written: number;
  time_spent: number; // Duration in seconds
  timestamp: Date;
  is_anky: boolean;
  newen_earned: number;
  daily_session_number: number;
  prompt: string;
  fid: number;

  // Threading component
  parent_anky_id: string;
  anky_response: string;

  // AI-generated content
  image_prompt: string;
  self_inquiry_question: string;

  // NFT-related fields
  token_id: string;
  contract_address: string;
  image_ipfs_hash: string;
  image_url: string;

  // Farcaster-related field
  cast_hash: string;

  // Status handling
  status: string;

  // Metadata
  ai_processed_at: Date | null;
  nft_minted_at: Date | null;
  blockchain_synced_at: Date | null;
  last_updated_at: Date;
}
