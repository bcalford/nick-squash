import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAuthorFeed, PROFILE_LITE, type ProfileLite } from "@/lib/feed";
import { Avatar } from "@/components/ui/Avatar";
import { SectionHeader } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { ChevronLeftIcon, ChevronRightIcon, LadderIcon } from "@/components/icons";
import { ClubJoinButton } from "@/components/clubs/ClubJoinButton";
import { PostCard } from "@/components/feed/PostCard";

type MemberRow = { user_id: string; role: "member" | "admin"; profile: ProfileLite };

export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: club } = await supabase.from("clubs").select("*").eq("id", id).maybeSingle();
  if (!club) notFound();

  const [
    {
      data: { user },
    },
    { data: members },
    { data: ladders },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("club_members")
      .select(`user_id, role, profile:profiles!club_members_user_id_fkey(${PROFILE_LITE})`)
      .eq("club_id", id)
      .returns<MemberRow[]>(),
    supabase.from("ladders").select("*").eq("club_id", id),
  ]);

  const viewerId = user?.id ?? null;
  const allMembers = members ?? [];
  const isMember = viewerId !== null && allMembers.some((m) => m.user_id === viewerId);
  const leaderboard = [...allMembers].sort((a, b) => b.profile.elo_rating - a.profile.elo_rating);
  const memberIds = allMembers.map((m) => m.user_id);
  const posts = await fetchAuthorFeed(supabase, viewerId, memberIds);

  return (
    <div className="mx-auto max-w-lg">
      <div className="flex h-12 items-center justify-between px-2 pt-safe">
        <Link
          href="/ladders"
          aria-label="Back"
          className="flex size-11 items-center justify-center rounded-full text-cobalt"
        >
          <ChevronLeftIcon size={24} />
        </Link>
        <span className="nav-title truncate">{club.name}</span>
        <span className="w-11" />
      </div>

      <header className="flex flex-col items-center gap-3 px-4 pb-2 pt-4 text-center">
        <Avatar src={club.avatar_url} name={club.name} size={80} />
        <div>
          <h1 className="text-[24px] font-extrabold">{club.name}</h1>
          <p className="text-[14px] text-ink-2">
            {club.city ? `${club.city} · ` : ""}
            {allMembers.length} member{allMembers.length === 1 ? "" : "s"}
          </p>
          {club.description && (
            <p className="mx-auto mt-1 max-w-[320px] text-[14px] leading-snug text-ink-2">
              {club.description}
            </p>
          )}
        </div>
        <ClubJoinButton clubId={club.id} viewerId={viewerId} initialMember={isMember} />
      </header>

      {(ladders ?? []).length > 0 && (
        <>
          <SectionHeader>Club ladders</SectionHeader>
          <div className="card hairline mx-4 overflow-hidden">
            {(ladders ?? []).map((l) => (
              <Link
                key={l.id}
                href={`/ladders/${l.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-inset"
              >
                <span className="flex size-9 items-center justify-center rounded-[10px] bg-cobalt-soft text-cobalt">
                  <LadderIcon size={18} />
                </span>
                <span className="flex-1 text-[15px] font-semibold">{l.name}</span>
                <ChevronRightIcon size={16} className="text-ink-3" />
              </Link>
            ))}
          </div>
        </>
      )}

      {leaderboard.length > 0 && (
        <>
          <SectionHeader>Leaderboard</SectionHeader>
          <div className="card hairline mx-4 overflow-hidden">
            {leaderboard.slice(0, 10).map((m, i) => {
              const name = m.profile.display_name ?? m.profile.username ?? "Player";
              return (
                <Link
                  key={m.user_id}
                  href={`/u/${m.profile.username}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-inset"
                >
                  <span
                    className={`tnum flex size-8 items-center justify-center rounded-full text-[14px] font-extrabold ${
                      i === 0 ? "gradient-signature" : "bg-inset text-ink-2"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <Avatar src={m.profile.avatar_url} name={name} size={36} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{name}</span>
                  {m.role === "admin" && <Chip tone="glass">Admin</Chip>}
                  <span className="tnum text-[15px] font-extrabold">{m.profile.elo_rating}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <SectionHeader>Club feed</SectionHeader>
      {posts.length === 0 ? (
        <p className="px-4 pb-8 text-center text-[15px] text-ink-3">
          No posts from members yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4 px-4 pb-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} viewerId={viewerId} />
          ))}
        </div>
      )}
      <div className="h-4" />
    </div>
  );
}
