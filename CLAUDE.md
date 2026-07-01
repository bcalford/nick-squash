# Nick — Squash social network + game tracker

## Project
A PWA social network and match tracker for squash players. iOS-native look and
feel, but vibrant and colorful. Target users: club and college squash players.

## Stack
- Next.js 15 App Router, TypeScript strict mode, Tailwind CSS v4, Framer Motion
- Supabase: Postgres + Auth + Realtime + Storage, with Row Level Security on EVERY table
- Recharts for stats. PWA with manifest + service worker.

## Hard rules
- All database access goes through Supabase client helpers in /lib/supabase.
  Never expose the service_role key to the client.
- Every table gets RLS policies. Write them in SQL migration files in /supabase/migrations.
- Mobile-first: design at 390px width first. The app must feel like a native
  iOS app: bottom tab bar, large titles, sheet-style modals, spring animations.
- TypeScript strict; no `any`. Zod for all form/API validation.
- Squash scoring is PAR-11 (point-a-rally to 11, win by 2), best of 5 games
  (support best of 3 as an option). Get this right.
- Ratings use Elo (K=32 provisional for first 10 matches, K=16 after),
  starting at 1200. Recalculate on match confirmation, not on entry.
- Run `npm run build` and fix all errors before declaring any task done.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build (must pass)
- `npx supabase db push` — apply migrations (if Supabase CLI is linked)

## Design system (summary — full tokens in /app/globals.css)
- Palette: Court White #FAFAF7 surfaces, Ink #0E1116 text, Cobalt #2952FF
  primary, Coral #FF5A47 accent/live, Volt #C8F542 success/win, Glass Blue
  #7FB5D6 tint. Dark mode: #0E1116 base with the same accents.
- Type: -apple-system / SF Pro stack. iOS large-title pattern (34px bold) on
  every top-level screen.
- Radius 16–24px cards, subtle shadows, 44px minimum touch targets.