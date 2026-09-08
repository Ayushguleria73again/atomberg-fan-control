---
name: webapp-conventions
description: Structure and conventions for the FanControl Next.js web app (direct-to-Atomberg build) — App Router + TypeScript + Tailwind, the server-side proxy pattern that keeps Atomberg secrets off the client, the API route contract (/api/fans, /api/fans/:id/cmd, /api/health), the token+state caching that respects the ~100 calls/day quota, optimistic UI, and PWA setup. Use when scaffolding the app, creating routes/components, or deciding where code belongs.
---

# Web app conventions (direct-to-Atomberg v1)

Full spec: `docs/05-webapp-spec.md`. Stack: Next.js App Router, TypeScript (strict), Tailwind, shadcn/ui, TanStack Query. Deploy: Vercel. **No Home Assistant in v1** — the server calls the Atomberg cloud directly (see the `atomberg-api` skill).

## The rule that shapes everything
Browser → same-origin `/api/*` → Atomberg cloud. Secrets live only in server code (`lib/atomberg.ts`, `app/api/**`). No client component imports the Atomberg client or reads `ATOMBERG_*`.

## Quota discipline (critical — ~100 calls/day)
- **No auto-polling.** Fetch state on mount + on a manual refresh button only.
- Cache the access token (refresh on 401) and device state (30–60s TTL) server-side.
- `get_device_state?device_id=all` returns all fans in ONE call — use it for a full refresh.
- Optimistic UI after commands; don't re-fetch state each time. Update the server cache optimistically instead.
- Debounce speed changes (~300ms).

## Layout
```
app/
  page.tsx                 dashboard
  settings/page.tsx
  api/
    fans/route.ts          GET list+state (cached; ?refresh=1 forces live)
    fans/[id]/cmd/route.ts POST command (validated)
    health/route.ts        GET connectivity
components/  FanCard PowerToggle SpeedControl LedToggle SleepToggle TimerMenu VoiceButton RefreshButton ConnectionBadge
lib/         atomberg.ts (server-only) cache.ts fanMeta.ts intents.ts
```

## API contract
- `GET /api/fans` → `[{ id,name,online,power,speed,led,sleep,timerHours,hasLed,hasSleep,hasTimer }]` (served from cache; `?refresh=1` forces a live call).
- `POST /api/fans/:id/cmd` → `{ action:"power"|"speed"|"led"|"sleep"|"timer", value }`; validate id∈known devices, action∈allowed, value in range; maps to an Atomberg `send_command` (see atomberg-api skill).
- `GET /api/health` → `{ ok }`.

## UI conventions
- Optimistic updates with rollback + toast on failure.
- Show "last updated" + a refresh button (no polling).
- Disable a fan's controls when `online:false`.
- Phone-first, big thumb targets; everything keyboard-accessible + labeled.
- Mic button (`VoiceButton`) with an ARIA label and visible listening state.

## PWA
`manifest.json` + a service worker so it installs to the phone home screen; icons in `public/`.

## Env (server-only)
`ATOMBERG_API_KEY`, `ATOMBERG_REFRESH_TOKEN` (required). Optional `UPSTASH_REDIS_REST_URL`/`_TOKEN` for cross-invocation cache, `APP_PASSCODE` for access control. `.env.example` has empty values; git-ignore `.env.local`.

## Constraints / Do not
- No secret in a client component or a `NEXT_PUBLIC_` var.
- No direct Atomberg calls from the browser.
- No timed polling of the Atomberg API.
- Don't skip input validation on the command route.
- Keep `lib/atomberg.ts` server-only (no `"use client"`).
