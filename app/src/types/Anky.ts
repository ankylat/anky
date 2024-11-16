export interface WritingSession {
  session_id: string | null;
  session_index_for_user?: number | null;
  user_id?: string | null;
  starting_timestamp?: Date;
  ending_timestamp?: Date | null;
  prompt?: string;
  writing?: string | null;
  words_written?: number | 0;
  newen_earned?: number | 0;
  is_onboarding?: boolean | null;

  time_spent?: number | null; // duration in seconds
  is_anky?: boolean | null;

  parent_anky_id?: string | null;
  anky_response?: string | null;

  status?: string | null;

  anky_id?: string | null;
  anky?: Anky | null;

  session_data?: SessionData;
}

export interface SessionData {
  text: string;
  startTime: number;
  keystrokes: Keystroke[];
  totalDuration: number;
  longestPause: number;
  wordCount: number;
  averageWPM: number;
  writing_patterns?: WritingPatterns;
}

export interface Keystroke {
  key?: string;
  delta?: number;
}

export interface Anky {
  id: string;
  user_id: string;
  writing_session_id: string;
  prompt: string;
  anky_reflection: string | null;
  anky_inquiry: string;
  image_url: string;
  image_ipfs_hash: string | null;
  status: string | null;
  cast_hash: string | null;
  created_at: Date;
  updated_at: Date;
  previous_anky_id: string | null;
  name: string | null;
  token_address: string | null;
}

export interface WritingPatterns {
  average_speed: number;
  longest_pause: number;
  speed_variations: SpeedChange[];
  pause_points: PausePoint[];
  flow_state_ranges: FlowRange[];
}

export interface SpeedChange {
  start_index: number;
  end_index: number;
  speed: number;
}

export interface PausePoint {
  index: number;
  duration: number;
  context: string;
}

export interface FlowRange {
  start_index: number;
  end_index: number;
  intensity: number;
}

export interface KeystrokeEvent {
  session_id: string;
  timestamp: Date;
  character: string;
  time_delta: number;
  position: number;
}

export interface NewenTransaction {
  hash: string;
  amount: number;
  timestamp: Date;
  details: string;
}
