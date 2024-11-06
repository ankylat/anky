export interface User {
  id: string;
  active_status?: string;
  total_writing_time?: number;
  last_session_date?: string | null;
  custody_address?: string;
  display_name?: string;
  fid?: number;
  follower_count?: number;
  following_count?: number;
  object?: string;
  pfp_url?: string;
  power_badge?: boolean;
  profile?: Profile;
  username?: string;
  verifications?: any[];
  verified_addresses?: any;
  viewer_context?: any;
  user_metadata?: UserMetadata;
  jwt?: string;
  is_anonymous?: boolean;
}

export interface Profile {
  bio?: Bio;
  location?: string;
  website?: string;
}

export interface Bio {
  text: string;
}

export interface AnkyUser {
  id: string;
  privy_did?: string;
  fid?: number | null;
  settings: any;
  walletAddress: string;
  createdAt: string;
}

export interface UserMetadata {
  device_id: string | null;
  platform: string;
  device_model: string;
  os_version: string;
  app_version: string;
  screen_width: number;
  screen_height: number;
  locale: string;
  timezone: string;
  created_at: string;
  last_active: string;
  user_agent: string;
  installation_source?: string;
}
