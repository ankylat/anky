import { Cast } from "./Cast";

export interface WritingSession {
  session_id: string;
  session_index_for_user: number | null;
  user_id: string | null;
  starting_timestamp: Date;
  ending_timestamp: Date | null;
  prompt: string;
  writing: string | null;
  words_written: number | 0;
  newen_earned?: number | 0;
  time_spent?: number | null; // duration in seconds
  is_anky: boolean;

  parent_anky_id?: string | null;

  status: string | null;

  anky_id?: string | null;
  anky?: Anky | null;
}

export interface Anky {
  id: string;
  user_id: string;
  writing_session_id: string;
  prompt: string;
  anky_reflection: string | null;
  image_url: string | null;
  image_ipfs_hash: string | null;
  status: string | null;
  cast_hash: string | null;
  created_at: Date;
  updated_at: Date;
  previous_anky_id: string | null;

  cast: Cast | null;
}
