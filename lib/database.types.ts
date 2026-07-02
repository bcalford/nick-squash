export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "competitive";
export type DominantHand = "left" | "right";
export type MatchStatus = "pending_confirmation" | "confirmed" | "disputed";
export type ClubRole = "member" | "admin";
export type ChallengeStatus = "pending" | "accepted" | "declined" | "completed";
export type NotificationType =
  | "match_confirmation_request"
  | "match_confirmed"
  | "match_disputed"
  | "new_follower"
  | "challenge_received"
  | "challenge_answered"
  | "achievement_earned"
  | "ladder_move"
  | "post_liked"
  | "post_commented";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  club_id: string | null;
  dominant_hand: DominantHand | null;
  skill_level: SkillLevel | null;
  elo_rating: number;
  matches_played: number;
  city: string | null;
  is_public: boolean;
  created_at: string;
};

export type Follow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export type Match = {
  id: string;
  created_by: string;
  player_a: string;
  player_b: string | null;
  opponent_guest_name: string | null;
  best_of: number;
  status: MatchStatus;
  winner_id: string | null;
  played_at: string;
  location: string | null;
  notes: string | null;
  elo_delta_a: number | null;
  elo_delta_b: number | null;
  created_at: string;
};

export type Game = {
  id: string;
  match_id: string;
  game_number: number;
  score_a: number;
  score_b: number;
  created_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  body: string;
  match_id: string | null;
  image_url: string | null;
  created_at: string;
};

export type Like = {
  user_id: string;
  post_id: string;
  created_at: string;
};

export type Comment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type Club = {
  id: string;
  name: string;
  city: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
};

export type ClubMember = {
  club_id: string;
  user_id: string;
  role: ClubRole;
  created_at: string;
};

export type Ladder = {
  id: string;
  club_id: string | null;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type LadderMember = {
  ladder_id: string;
  user_id: string;
  position: number;
  created_at: string;
};

export type LadderPositionEvent = {
  id: string;
  ladder_id: string;
  user_id: string;
  old_position: number | null;
  new_position: number;
  match_id: string | null;
  created_at: string;
};

export type Challenge = {
  id: string;
  challenger_id: string;
  challenged_id: string;
  ladder_id: string | null;
  status: ChallengeStatus;
  proposed_time: string | null;
  message: string | null;
  created_at: string;
};

export type Achievement = {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteria: Json;
  created_at: string;
};

export type UserAchievement = {
  user_id: string;
  achievement_id: string;
  earned_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  payload: Json;
  read: boolean;
  created_at: string;
};

type Table<Row, Required extends keyof Row, Generated extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required | Generated>>;
  Update: Partial<Omit<Row, Generated>>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id", "created_at">;
      follows: Table<Follow, "follower_id" | "following_id", "created_at">;
      matches: Table<Match, "created_by" | "player_a", "id" | "created_at">;
      games: Table<Game, "match_id" | "game_number" | "score_a" | "score_b", "id" | "created_at">;
      posts: Table<Post, "author_id", "id" | "created_at">;
      likes: Table<Like, "user_id" | "post_id", "created_at">;
      comments: Table<Comment, "post_id" | "author_id" | "body", "id" | "created_at">;
      clubs: Table<Club, "name" | "created_by", "id" | "created_at">;
      club_members: Table<ClubMember, "club_id" | "user_id", "created_at">;
      ladders: Table<Ladder, "name" | "created_by", "id" | "created_at">;
      ladder_members: Table<LadderMember, "ladder_id" | "user_id", "created_at">;
      ladder_position_events: Table<
        LadderPositionEvent,
        "ladder_id" | "user_id" | "new_position",
        "id" | "created_at"
      >;
      challenges: Table<Challenge, "challenger_id" | "challenged_id", "id" | "created_at">;
      achievements: Table<Achievement, "code" | "name" | "description" | "icon", "id" | "created_at">;
      user_achievements: Table<UserAchievement, "user_id" | "achievement_id", "earned_at">;
      notifications: Table<Notification, "user_id" | "type", "id" | "created_at">;
    };
    Views: Record<string, never>;
    Functions: {
      confirm_guest_match: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      skill_level: SkillLevel;
      dominant_hand: DominantHand;
      match_status: MatchStatus;
      club_role: ClubRole;
      challenge_status: ChallengeStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
