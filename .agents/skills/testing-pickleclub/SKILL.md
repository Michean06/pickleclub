---
name: testing-pickleclub
description: How to set up and run end-to-end tests for the PickleClub Next.js + Supabase app (dev server, test player accounts, messaging/realtime features, known Supabase RLS pitfalls).
---

# Testing PickleClub locally

## Running the app

- Dev server: `npm run dev` → serves on **port 4028** (not 3000).
  Run it in a persistent shell; backgrounding it with `nohup ... &` from a one-shot shell tends to
  die silently.
- `npx next build` works, but **never run it while `next dev` is running** — it corrupts `.next` and
  every page then throws `__webpack_modules__[moduleId] is not a function`. Recovery:
  `pkill -f "next dev" && rm -rf .next && npm run dev`.
- Env comes from `.env` in the repo root; it already contains
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` pointing at a live hosted Supabase
  project. There is no local Supabase instance.
- Preexisting unrelated `tsc` errors: `src/app/admin-panel/components/AdminActivityFeed.tsx`,
  `src/components/messaging/MessageInput.tsx`.

## Creating test player accounts

Email confirmation is disabled and a DB trigger auto-creates the `user_profiles` row (with a
`PKL-…` player id), so accounts can be created in one call:

```bash
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"testplayer.a1@example.com","password":"TestPass123!"}'
```

Then log in via the UI at `/login` (email + password fields, "Sign In" button). For two
simultaneous players, use a normal window for player A and an **incognito** window for player B —
sessions are independent.

## Messaging feature paths

- Player chat page: `/player-messaging` (sidebar item "Messages").
- To start a chat: **New Message** button (top right) → type the other player's `full_name` or
  `player_id` → click the result. This calls the `get_or_create_direct_conversation` RPC.
- Realtime chat logic lives in `src/app/player-messaging/hooks/useRealtimeChat.ts`
  (history load, `mark_messages_as_read` RPC, per-conversation `postgres_changes` channel filtered
  by `conversation_id`, optimistic send with id-based dedupe). The page keeps a separate
  `global-messages` channel only to refresh the sidebar for non-active conversations.

## Known blocker: recursive RLS policy (check this FIRST)

Before planning any messaging test, verify reads actually work:

```bash
TOK=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
  -H "Content-Type: application/json" \
  -d '{"email":"testplayer.a1@example.com","password":"TestPass123!"}' | jq -r .access_token)
curl -s "$URL/rest/v1/messages?select=id&limit=1" -H "apikey: $ANON" -H "Authorization: Bearer $TOK"
```

If this returns
`{"code":"42P17","message":"infinite recursion detected in policy for relation \"conversation_members\""}`
then the hosted DB still has the old policies from
`supabase/migrations/001_create_messaging_tables.sql`, and **no message history or realtime event
will ever reach the UI** (writes still succeed because `send_message` /
`get_or_create_direct_conversation` are SECURITY DEFINER RPCs, so the DB fills up silently while the
UI shows "No conversations yet"). Symptom in the browser console:
`[useRealtimeChat] load messages error`.

Fix: apply `supabase/migrations/20260724106000_fix_recursion.sql` (and possibly
`20260724102000_complete_rls_fix.sql`, `20260724105000_simplify_rls.sql`) to the hosted project.
This requires the service-role key or DB password — escalate for them rather than guessing.
Also confirm Realtime replication is enabled for `public.messages`
(Supabase Dashboard → Database → Replication).

## Devin Secrets Needed

- `SUPABASE_SERVICE_ROLE_KEY` (project `dcspwvfoiguaculukvdw`) — to apply RLS/migration fixes, or
- `SUPABASE_DB_URL` (Postgres connection string incl. password) — to run migrations with `psql`.
- Nothing else: the anon key and URL are committed in `.env`.

## Node caveat

The box runs Node 20; `@supabase/supabase-js` realtime cannot open a WebSocket there
(`Node.js detected but native WebSocket not found`). Test realtime through the browser UI, not with
a Node script.
