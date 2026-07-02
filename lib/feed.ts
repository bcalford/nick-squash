import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Game, Match, Post, Profile } from "@/lib/database.types";

export type ProfileLite = Pick<
  Profile,
  "id" | "username" | "display_name" | "avatar_url" | "elo_rating"
>;

export const PROFILE_LITE = "id, username, display_name, avatar_url, elo_rating";

export type MatchWithGames = Match & {
  games: Game[];
  player_a_profile: ProfileLite | null;
  player_b_profile: ProfileLite | null;
};

export type FeedPost = Post & {
  author: ProfileLite;
  match: MatchWithGames | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
};

type Client = SupabaseClient<Database>;

export const POST_SELECT = `*,
  author:profiles!posts_author_id_fkey(${PROFILE_LITE}),
  match:matches!posts_match_id_fkey(*,
    games(*),
    player_a_profile:profiles!matches_player_a_fkey(${PROFILE_LITE}),
    player_b_profile:profiles!matches_player_b_fkey(${PROFILE_LITE})
  ),
  likes(count),
  comments(count)`;

type RawPost = Post & {
  author: ProfileLite;
  match: MatchWithGames | null;
  likes: { count: number }[];
  comments: { count: number }[];
};

export const FEED_PAGE_SIZE = 15;

async function decorateWithMyLikes(
  supabase: Client,
  userId: string | null,
  raw: RawPost[]
): Promise<FeedPost[]> {
  let likedIds = new Set<string>();
  if (userId && raw.length > 0) {
    const { data } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", userId)
      .in(
        "post_id",
        raw.map((p) => p.id)
      );
    likedIds = new Set((data ?? []).map((l) => l.post_id));
  }
  return raw.map(({ likes, comments, ...post }) => ({
    ...post,
    match: post.match
      ? { ...post.match, games: [...post.match.games].sort((a, b) => a.game_number - b.game_number) }
      : null,
    like_count: likes[0]?.count ?? 0,
    comment_count: comments[0]?.count ?? 0,
    liked_by_me: likedIds.has(post.id),
  }));
}

/** Posts by people you follow, members of your clubs, and yourself. */
export async function fetchFollowingFeed(
  supabase: Client,
  userId: string,
  cursor?: string
): Promise<FeedPost[]> {
  const [{ data: follows }, { data: myClubs }] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("club_members").select("club_id").eq("user_id", userId),
  ]);

  const authorIds = new Set<string>([userId]);
  for (const f of follows ?? []) authorIds.add(f.following_id);

  const clubIds = (myClubs ?? []).map((c) => c.club_id);
  if (clubIds.length > 0) {
    const { data: clubmates } = await supabase
      .from("club_members")
      .select("user_id")
      .in("club_id", clubIds)
      .limit(300);
    for (const m of clubmates ?? []) authorIds.add(m.user_id);
  }

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .in("author_id", [...authorIds])
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query.returns<RawPost[]>();
  if (error) throw new Error(error.message);
  return decorateWithMyLikes(supabase, userId, data ?? []);
}

/** Public posts, preferring the viewer's city when known. */
export async function fetchDiscoverFeed(
  supabase: Client,
  userId: string | null,
  city: string | null,
  cursor?: string
): Promise<FeedPost[]> {
  let authorIds: string[] | null = null;
  if (city) {
    const { data: locals } = await supabase
      .from("profiles")
      .select("id")
      .ilike("city", city)
      .limit(200);
    if (locals && locals.length > 0) authorIds = locals.map((p) => p.id);
  }

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (authorIds) query = query.in("author_id", authorIds);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query.returns<RawPost[]>();
  if (error) throw new Error(error.message);
  return decorateWithMyLikes(supabase, userId, data ?? []);
}

/** Posts authored by one user (profile pages) or one club's members. */
export async function fetchAuthorFeed(
  supabase: Client,
  viewerId: string | null,
  authorIds: string[],
  cursor?: string
): Promise<FeedPost[]> {
  if (authorIds.length === 0) return [];
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .in("author_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query.returns<RawPost[]>();
  if (error) throw new Error(error.message);
  return decorateWithMyLikes(supabase, viewerId, data ?? []);
}
