import { User as PrivyUserType } from "@privy-io/expo";
import { Anky } from "./Anky";

export interface FarcasterAccount {
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
  privy_account?: PrivyUserType;
  chosen_anky?: Anky;
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
  wallet_address: string;
  jwt: string;
  created_at: string;
  streak: number;
  farcaster_account?: FarcasterAccount;
  privy_user?: PrivyUserType;
  metadata?: UserMetadata;
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
