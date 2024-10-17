export interface User {
  active_status?: string;
  custody_address?: string;
  display_name: string;
  fid: number;
  follower_count: number;
  following_count: number;
  object?: string;
  pfp_url: string;
  power_badge?: boolean;
  profile?: Profile;
  username: string;
  verifications?: any[];
  verified_addresses?: any;
  viewer_context?: any;
}

export interface Profile {
  bio?: Bio;
  location?: string;
  website?: string;
}

export interface Bio {
  text: string;
}
