export interface WritingGameProps {
  targetDuration: number;
  directions: {
    center: Direction;
    up: Direction;
    right: Direction;
    down: Direction;
    left: Direction;
  };
}

export interface Direction {
  direction: "up" | "center" | "right" | "down" | "left";
  prompt: string;
  color: string;
  textColor: string;
}

export interface SessionData {
  text: string;
  startTime: number;
  keystrokes: Keystroke[];
  totalDuration: number;
  longestPause: number;
  wordCount: number;
  averageWPM: number;
  endReason: "timeout" | "completed";
}

export type GameState = {
  status: "intro" | "writing" | "failed" | "completed";
  session_id: string;
  text: string;
  game_over: boolean;
  words_written: number;
  session_index_for_user: number;
  time_spent: number;
  starting_timestamp: Date;
  ending_timestamp: Date | null;
  prompt: string;
  user_id: string;
  is_session_active: boolean;
  came_back_to_read: boolean;
  session_started: boolean;
  target_reached: boolean;
  display_seconds: boolean;
  current_mode: "center" | "left" | "right";
  keyboard_height: number;
  is_onboarding: boolean;
};

export interface Keystroke {
  key?: string;
  timestamp?: number;
  timeSinceLastKeystroke?: number;
}
