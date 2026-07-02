# Nick 🎾 — Squash Social Network & Match Tracker

A mobile-first PWA for club and college squash players: log matches with real
PAR-11 scoring, climb an Elo ladder, follow rivals, post to a feed, join clubs,
and earn achievements. Built to feel like a native iOS app — bottom tab bar,
large titles, sheet modals, spring animations — with a vibrant Cobalt/Coral/Volt
palette.

## Stack

- **Next.js 16** (App Router) · TypeScript strict · Tailwind CSS v4 · Framer Motion
- **Supabase** — Postgres + Auth + Realtime + Storage, RLS on every table
- **Recharts** for the stats dashboard · **Zod** for validation · **Vitest** for tests

## Setup

### 1. Environment

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server-only; never shipped to the client
```

### 2. Database migrations

Run each file in `supabase/migrations/` **in numeric order** in the Supabase
SQL editor (or `npx supabase db push` if the CLI is linked):

| File | Creates |
|---|---|
| `001_extensions_profiles.sql` | citext, enums, `profiles` + auto-create trigger on `auth.users` |
| `002_follows.sql` | follow graph |
| `003_matches_games.sql` | `matches`, `games` with the PAR-11 CHECK constraint |
| `004_posts_likes_comments.sql` | feed tables |
| `005_clubs.sql` | clubs + membership (founder auto-admin) |
| `006_ladders_challenges.sql` | ladders, position events, challenges |
| `007_achievements_notifications.sql` | achievement catalog (12 seeded) + notifications |
| `008_match_confirmation.sql` | the confirmation trigger: winner, Elo, posts, notifications, ladder swaps |
| `009_storage_realtime.sql` | `avatars` / `post-images` buckets + realtime publication |

Also enable **email confirmations** in Supabase Auth settings (the app routes
the confirmation link through the public `/auth/callback` handler), and set the
Site URL to your deployment origin.

### 3. Run

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # scoring + Elo unit tests (vitest)
npm run build   # production build
```

## Feature tour

- **Feed (`/`)** — infinite scroll of posts from people you follow plus your
  club mates. Match-result cards show a per-game score grid, Elo-change chips,
  and the winner highlighted in Volt. Like (optimistic) and comment (bottom
  sheet). A Discover toggle surfaces public posts near your city, and a
  Realtime pill announces new posts.
- **Play (`/play`)** — search players by name/username/city, follow, and send
  challenges with a proposed time and message. Incoming challenges have
  accept/decline; accepted ones deep-link into the logger.
- **Log (`/log`)** — the center tab. **Live scoring**: a full-screen scorer
  with giant tap targets, court-line motif, PAR-11 game/match auto-detection,
  serve-and-box indicator that follows PAR rules, undo, and a game banner.
  **Quick entry**: type final game scores with per-row and whole-match
  validation. Registered opponents get a confirmation request — Elo applies
  only when *they* confirm (the logger can never confirm their own win). Guest
  matches save instantly but are never rated.
- **Ladders (`/ladders`)** — open and club ladders with live position updates,
  weekly movement arrows, and challenge-from-ladder. Beating someone above you
  swaps you into their spot (enforced in the database trigger). The Clubs tab
  covers founding a club, member lists, an Elo leaderboard, and a club feed.
- **Profile (`/u/username`)** — gradient Elo chip, W-L record, streak flame,
  Recharts dashboard (Elo over time, win rate, points per game, results by
  match length), match history, achievements grid (earned in color, locked in
  grayscale), head-to-head records, follower lists, edit sheet, dark-mode
  toggle, sign out.
- **Match detail (`/m/id`)** — public, shareable score page with Elo swing and
  comments; the opponent confirms or disputes from here.
- **Notifications** — bell with a live unread badge (Supabase Realtime);
  confirmations, follows, challenges, achievements, and ladder moves all
  deep-link to the right screen.
- **PWA** — installable (manifest + icons), offline shell via service worker,
  apple-touch-icon and status-bar metas for iOS.

## Architecture notes

- **Elo & match confirmation live in Postgres** (`008_match_confirmation.sql`):
  one `SECURITY DEFINER` trigger (explicit `search_path`) derives the winner,
  applies Elo (K=32 for a player's first 10 rated matches, K=16 after, start
  1200), increments rated-match counts, creates the auto match post, awards
  achievements, sends notifications, and applies ladder swaps — all atomically
  on `status → 'confirmed'`. `lib/elo.ts` and `lib/scoring.ts` are pure TS
  mirrors used for the live scorer and optimistic UI, covered by `npm test`.
- **RLS is the security boundary.** Every table has policies; the key one:
  only the participant who did *not* log a match can flip it to
  `confirmed`/`disputed`. Storage buckets allow public read but writes only
  inside the uploader's own `{uid}/` folder.
- **Auth flow**: middleware (`proxy.ts`) refreshes sessions on every request,
  keeps `/login`, `/signup`, `/auth/*`, and `/m/*` public, and gates users
  without a username into `/onboarding`. Profile rows are created by a
  database trigger at signup, never from the client.

## Honest limitations (v1)

- `matches_played` counts **rated** matches only (it drives the provisional
  K-factor); total match counts are derived from match history.
- Discover uses exact-city matching, not geo-distance.
- `post_liked` / `post_commented` notification types exist in the schema but
  no trigger emits them yet.
- Disputed matches are frozen rather than re-editable; the creator can retract
  a pending match, not amend it.
- The service worker caches the static shell only — feed data isn't available
  offline.
