import Link from "next/link";
import type { MatchWithGames } from "@/lib/feed";
import { Avatar } from "@/components/ui/Avatar";
import { Chip, EloDelta } from "@/components/ui/Chip";
import { formatDate } from "@/lib/time";

function playerName(
  profile: { display_name: string | null; username: string | null } | null,
  guestName: string | null
) {
  return profile?.display_name ?? profile?.username ?? guestName ?? "Guest";
}

/**
 * Score grid for a finished (or pending) match. Winner column glows Volt.
 * Player A/B rows follow the match record; Elo chips only when rated deltas exist.
 */
export function MatchResultCard({
  match,
  link = true,
}: {
  match: MatchWithGames;
  link?: boolean;
}) {
  const nameA = playerName(match.player_a_profile, null);
  const nameB = playerName(match.player_b_profile, match.opponent_guest_name);
  const wonA = match.games.filter((g) => g.score_a > g.score_b).length;
  const wonB = match.games.length - wonA;
  const aWins = wonA > wonB;
  const pending = match.status === "pending_confirmation";
  const disputed = match.status === "disputed";

  const rows = [
    {
      name: nameA,
      avatar: match.player_a_profile,
      games: match.games.map((g) => g.score_a),
      won: wonA,
      isWinner: aWins,
      delta: match.elo_delta_a,
    },
    {
      name: nameB,
      avatar: match.player_b_profile,
      games: match.games.map((g) => g.score_b),
      won: wonB,
      isWinner: !aWins,
      delta: match.elo_delta_b,
    },
  ];

  const body = (
    <div className="rounded-[16px] bg-bg p-3">
      <div className="flex items-center justify-between pb-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">
          Best of {match.best_of}
          {match.location ? ` · ${match.location}` : ""} · {formatDate(match.played_at)}
        </span>
        {pending && <Chip tone="coral">Awaiting confirm</Chip>}
        {disputed && <Chip tone="coral">Disputed</Chip>}
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 rounded-[12px] px-2 py-1.5 ${
              row.isWinner && !pending && !disputed ? "bg-volt-soft" : ""
            }`}
          >
            {row.avatar ? (
              <Avatar src={row.avatar.avatar_url} name={row.name} size={28} />
            ) : (
              <Avatar name={row.name} size={28} />
            )}
            <span
              className={`min-w-0 flex-1 truncate text-[14px] ${
                row.isWinner ? "font-extrabold" : "font-medium text-ink-2"
              }`}
            >
              {row.name}
            </span>
            {row.delta !== null && <EloDelta delta={row.delta} />}
            <div className="flex gap-1">
              {row.games.map((score, gi) => {
                const otherScore = rows[1 - i].games[gi];
                const won = score > otherScore;
                return (
                  <span
                    key={gi}
                    className={`tnum flex h-7 w-7 items-center justify-center rounded-[8px] text-[13px] font-extrabold ${
                      won ? "bg-volt text-[#1a2400]" : "bg-inset text-ink-2"
                    }`}
                  >
                    {score}
                  </span>
                );
              })}
            </div>
            <span
              className={`tnum w-5 text-right text-[17px] font-extrabold ${
                row.isWinner ? "" : "text-ink-3"
              }`}
            >
              {row.won}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  if (!link) return body;
  return (
    <Link href={`/m/${match.id}`} className="block active:opacity-80">
      {body}
    </Link>
  );
}
