"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SearchIcon } from "@/components/icons";
import type { Profile } from "@/lib/database.types";

export type Opponent =
  | { kind: "registered"; profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "elo_rating"> }
  | { kind: "guest"; name: string };

export function OpponentPicker({
  value,
  onChange,
}: {
  value: Opponent | null;
  onChange: (opponent: Opponent | null) => void;
}) {
  const [mode, setMode] = useState<"registered" | "guest">("registered");
  const [query, setQuery] = useState("");
  const [fetched, setFetched] = useState<Opponent[]>([]);
  const [searching, setSearching] = useState(false);

  const searchActive = mode === "registered" && query.trim().length >= 2;
  const results = searchActive ? fetched : [];

  useEffect(() => {
    if (!searchActive) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, elo_rating")
        .or(`username.ilike.%${query.trim()}%,display_name.ilike.%${query.trim()}%`)
        .neq("id", user?.id ?? "")
        .not("username", "is", null)
        .limit(8);
      if (!cancelled) {
        setFetched((data ?? []).map((profile) => ({ kind: "registered", profile })));
        setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, searchActive]);

  if (value) {
    return (
      <button
        onClick={() => onChange(null)}
        className="flex w-full items-center gap-3 rounded-[16px] border-2 border-cobalt bg-cobalt-soft px-4 py-3"
      >
        {value.kind === "registered" ? (
          <>
            <Avatar
              src={value.profile.avatar_url}
              name={value.profile.display_name ?? value.profile.username ?? "?"}
              size={40}
            />
            <span className="flex-1 text-left">
              <span className="block text-[15px] font-semibold">
                {value.profile.display_name ?? value.profile.username}
              </span>
              <span className="block text-[13px] text-ink-2">
                @{value.profile.username} · {value.profile.elo_rating}
              </span>
            </span>
          </>
        ) : (
          <>
            <Avatar name={value.name} size={40} />
            <span className="flex-1 text-left">
              <span className="block text-[15px] font-semibold">{value.name}</span>
              <span className="block text-[13px] text-ink-2">Guest · not rated</span>
            </span>
          </>
        )}
        <span className="text-[13px] font-semibold text-cobalt">Change</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        options={[
          { value: "registered", label: "On Nick" },
          { value: "guest", label: "Guest" },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === "registered" ? (
        <>
          <div className="flex items-center gap-2 rounded-[14px] border border-separator bg-elevated px-3">
            <SearchIcon size={18} className="text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or @username"
              className="h-11 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            />
          </div>
          <div className="flex flex-col gap-1">
            {searching && <p className="px-2 text-[13px] text-ink-3">Searching…</p>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <p className="px-2 text-[13px] text-ink-3">
                No players found — log them as a guest instead.
              </p>
            )}
            {results.map((r) =>
              r.kind === "registered" ? (
                <button
                  key={r.profile.id}
                  onClick={() => onChange(r)}
                  className="flex items-center gap-3 rounded-[14px] px-2 py-2 text-left active:bg-inset"
                >
                  <Avatar
                    src={r.profile.avatar_url}
                    name={r.profile.display_name ?? r.profile.username ?? "?"}
                    size={40}
                  />
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold">
                      {r.profile.display_name ?? r.profile.username}
                    </span>
                    <span className="block text-[13px] text-ink-2">
                      @{r.profile.username} · {r.profile.elo_rating} Elo
                    </span>
                  </span>
                </button>
              ) : null
            )}
          </div>
        </>
      ) : (
        <input
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const name = e.currentTarget.value.trim();
              if (name) onChange({ kind: "guest", name });
            }
          }}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name) onChange({ kind: "guest", name });
          }}
          placeholder="Guest’s name (won’t affect Elo)"
          className="h-[50px] rounded-[14px] border border-separator bg-elevated px-4 text-[17px] outline-none placeholder:text-ink-3 focus:border-cobalt"
        />
      )}
    </div>
  );
}
