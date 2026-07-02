"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { clubSchema, ladderSchema } from "@/lib/validation";
import type { Club, Ladder } from "@/lib/database.types";
import { LargeTitleHeader } from "@/components/shell/LargeTitleHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { RowsSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Chip } from "@/components/ui/Chip";
import { ChevronRightIcon, LadderIcon, PlusIcon } from "@/components/icons";

type LaddersTab = "ladders" | "clubs";
type LadderRow = Ladder & { ladder_members: { count: number }[] };
type ClubRow = Club & { club_members: { count: number }[] };

export default function LaddersPage() {
  const [tab, setTab] = useState<LaddersTab>("ladders");
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [ladders, setLadders] = useState<LadderRow[] | null>(null);
  const [clubs, setClubs] = useState<ClubRow[] | null>(null);
  const [myLadderIds, setMyLadderIds] = useState<Set<string>>(new Set());
  const [myClubIds, setMyClubIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");

  const load = useCallback(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => {
        const userId = user?.id ?? null;
        return Promise.all([
          Promise.resolve(userId),
          supabase
            .from("ladders")
            .select("*, ladder_members(count)")
            .order("created_at", { ascending: false })
            .limit(50)
            .returns<LadderRow[]>(),
          supabase
            .from("clubs")
            .select("*, club_members(count)")
            .order("created_at", { ascending: false })
            .limit(50)
            .returns<ClubRow[]>(),
          userId
            ? supabase.from("ladder_members").select("ladder_id").eq("user_id", userId)
            : Promise.resolve({ data: [] }),
          userId
            ? supabase.from("club_members").select("club_id").eq("user_id", userId)
            : Promise.resolve({ data: [] }),
        ]);
      })
      .then(([userId, ladderRes, clubRes, myLadders, myClubs]) => {
        setViewerId(userId);
        setLadders(ladderRes.data ?? []);
        setClubs(clubRes.data ?? []);
        setMyLadderIds(new Set((myLadders.data ?? []).map((m) => m.ladder_id)));
        setMyClubIds(new Set((myClubs.data ?? []).map((m) => m.club_id)));
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create() {
    if (!viewerId || creating) return;
    setCreating(true);
    setError(null);
    const supabase = createClient();
    if (tab === "ladders") {
      const parsed = ladderSchema.safeParse({
        name,
        description: description.trim() || undefined,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        setCreating(false);
        return;
      }
      const { data: ladder, error: insertError } = await supabase
        .from("ladders")
        .insert({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          created_by: viewerId,
        })
        .select("id")
        .single();
      if (insertError) {
        setError(insertError.message);
        setCreating(false);
        return;
      }
      // creator joins their own ladder at position 1
      await supabase.from("ladder_members").insert({ ladder_id: ladder.id, user_id: viewerId });
    } else {
      const parsed = clubSchema.safeParse({
        name,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        setCreating(false);
        return;
      }
      const { error: insertError } = await supabase.from("clubs").insert({
        name: parsed.data.name,
        city: parsed.data.city ?? null,
        description: parsed.data.description ?? null,
        created_by: viewerId,
      });
      if (insertError) {
        setError(insertError.message);
        setCreating(false);
        return;
      }
    }
    setCreating(false);
    setCreateOpen(false);
    setName("");
    setDescription("");
    setCity("");
    load();
  }

  return (
    <div className="mx-auto max-w-lg">
      <LargeTitleHeader
        title="Ladders"
        trailing={
          <button
            onClick={() => setCreateOpen(true)}
            aria-label={tab === "ladders" ? "Create ladder" : "Create club"}
            className="flex size-11 items-center justify-center rounded-full text-cobalt"
          >
            <PlusIcon size={24} />
          </button>
        }
      />
      <div className="flex flex-col gap-4">
        <div className="px-4">
          <SegmentedControl
            options={[
              { value: "ladders", label: "Ladders" },
              { value: "clubs", label: "Clubs" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {tab === "ladders" ? (
          ladders === null ? (
            <RowsSkeleton rows={5} />
          ) : ladders.length === 0 ? (
            <EmptyState
              icon={<LadderIcon />}
              title="No ladders yet"
              message="Start the first ladder and stake your claim to the top rung."
              action={<Button onClick={() => setCreateOpen(true)}>Create a Ladder</Button>}
            />
          ) : (
            <div className="card hairline mx-4 mb-4 overflow-hidden">
              {ladders.map((l) => (
                <Link
                  key={l.id}
                  href={`/ladders/${l.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-inset"
                >
                  <span className="flex size-10 items-center justify-center rounded-[12px] bg-cobalt-soft text-cobalt">
                    <LadderIcon size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{l.name}</span>
                    <span className="text-[13px] text-ink-3">
                      {l.ladder_members[0]?.count ?? 0} players ·{" "}
                      {l.club_id ? "club ladder" : "open ladder"}
                    </span>
                  </span>
                  {myLadderIds.has(l.id) && <Chip tone="cobalt">Joined</Chip>}
                  <ChevronRightIcon size={16} className="text-ink-3" />
                </Link>
              ))}
            </div>
          )
        ) : clubs === null ? (
          <RowsSkeleton rows={5} />
        ) : clubs.length === 0 ? (
          <EmptyState
            icon={<LadderIcon />}
            title="No clubs yet"
            message="Found your club on Nick and rally your members."
            action={<Button onClick={() => setCreateOpen(true)}>Create a Club</Button>}
          />
        ) : (
          <div className="card hairline mx-4 mb-4 overflow-hidden">
            {clubs.map((c) => (
              <Link
                key={c.id}
                href={`/clubs/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 active:bg-inset"
              >
                <Avatar src={c.avatar_url} name={c.name} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">{c.name}</span>
                  <span className="text-[13px] text-ink-3">
                    {c.club_members[0]?.count ?? 0} members
                    {c.city ? ` · ${c.city}` : ""}
                  </span>
                </span>
                {myClubIds.has(c.id) && <Chip tone="cobalt">Member</Chip>}
                <ChevronRightIcon size={16} className="text-ink-3" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={tab === "ladders" ? "New Ladder" : "New Club"}
      >
        <div className="flex flex-col gap-4 px-4 pb-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tab === "ladders" ? "Tuesday Night Ladder" : "Riverside Squash Club"}
              className="h-11 rounded-[12px] border border-separator bg-bg px-3 text-[15px] outline-none placeholder:text-ink-3 focus:border-cobalt"
            />
          </label>
          {tab === "clubs" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink-2">City</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 rounded-[12px] border border-separator bg-bg px-3 text-[15px] outline-none focus:border-cobalt"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-ink-2">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none rounded-[12px] border border-separator bg-bg p-3 text-[15px] outline-none focus:border-cobalt"
            />
          </label>
          {error && <p className="text-center text-[13px] font-medium text-coral">{error}</p>}
          <Button size="lg" onClick={create} loading={creating} disabled={!name.trim()}>
            {tab === "ladders" ? "Create Ladder" : "Found Club"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
