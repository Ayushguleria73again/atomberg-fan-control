# 05 — Web App Specification (Direct-to-Atomberg, v1)

The app is a **Next.js (App Router) PWA**. The browser talks only to its own `/api/*` routes; those routes call the **Atomberg Cloud API** ([03](03-atomberg-api.md)) with the secrets held server-side. No Home Assistant in v1.

## Tech stack

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router), TypeScript (strict) |
| Styling | Tailwind CSS |
| UI components | shadcn/ui (recommended) |
| Data/state | TanStack Query (fetch on open + manual refresh; **no auto-poll**) |
| Server cache | module-level in-memory to start; Upstash Redis for robustness |
| Voice | Web Speech API — see [06-voice-control.md](06-voice-control.md) |
| PWA | `manifest.json` + service worker (installs to phone home screen) |
| Deploy | Vercel (server env vars hold Atomberg creds) |

## Screens

### 1. Dashboard (`/`)
- Header: app name, a big **mic button** (voice), a **refresh** button, and a "last updated HH:MM" label.
- A **card per fan** (your 4 fans in [docs/10](10-your-devices.md)):
  - Friendly name + room; online/offline dot.
  - **Power toggle**.
  - **Speed** 1–6 (segmented control or slider).
  - **LED toggle** (your fans have it).
  - **Sleep** toggle.
  - **Timer** menu (off / 1h / 2h / … — confirm mapping first, see below).
  - Optimistic "pending" state on a control while a command is in flight.
- Empty/error states: "Couldn't reach Atomberg" + retry.

### 2. Settings (`/settings`)
- Voice language + the fan alias map for voice.
- "Test connection" button hitting `/api/health`.
- Shows quota-friendly behavior (no polling) so it's clear why state needs a refresh.

## Layout (suggested)

```
app/
  layout.tsx
  page.tsx                 // dashboard
  settings/page.tsx
  api/
    fans/route.ts          // GET list + state (cached)
    fans/[id]/cmd/route.ts // POST a command
    health/route.ts        // GET connectivity check
lib/
  atomberg.ts              // server-only Atomberg client (auth + calls + cache)
  cache.ts                 // token + state cache (in-memory or Redis)
  fanMeta.ts               // device IDs, friendly names, capabilities
  intents.ts               // voice text -> { deviceId, action, value }
components/
  FanCard.tsx  PowerToggle.tsx  SpeedControl.tsx  LedToggle.tsx
  SleepToggle.tsx  TimerMenu.tsx  VoiceButton.tsx  RefreshButton.tsx  ConnectionBadge.tsx
```

## Server-side Atomberg client (`lib/atomberg.ts`)

Responsibilities (see the `atomberg-api` skill for exact endpoints/headers):
- `getAccessToken()` — return a cached access token; fetch via `/v1/get_access_token` on miss or after a `401`.
- `listDevices()` — `/v1/get_list_of_devices` (rarely needed; device list is static, cache it or hardcode from `fanMeta.ts`).
- `getState()` — `/v1/get_device_state?device_id=all`; **cache result with a 30–60s TTL**.
- `sendCommand(deviceId, command)` — `/v1/send_command`.
- All requests send `x-api-key` and `Authorization: Bearer <token>`; handle `401` (refresh+retry once) and `429` (surface "rate limited, try again shortly").

## API routes (the client contract)

### `GET /api/fans`
Returns normalized fans, served from the state cache when fresh:
```json
[
  { "id": "3844be560e10", "name": "Balcony", "online": true,
    "power": false, "speed": 5, "led": false, "sleep": false, "timerHours": 0,
    "hasLed": true, "hasSleep": true, "hasTimer": true }
]
```
Accept `?refresh=1` to force a live fetch (used by the refresh button).

### `POST /api/fans/:id/cmd`
Body: `{ "action": "power"|"speed"|"led"|"sleep"|"timer", "value": ... }`
- Validate `id` ∈ known device IDs, `action` ∈ allowed set, `value` in range (speed 1–6; booleans; timer preset).
- Translate to an Atomberg command object and call `sendCommand`:

| action | command sent |
|--------|--------------|
| power | `{ "power": true/false }` |
| speed | `{ "speed": 1..6 }` |
| led | `{ "led": true/false }` |
| sleep | `{ "sleep": true/false }` *(confirm key — see below)* |
| timer | `{ "timer": <preset> }` *(confirm key + mapping — see below)* |

Return `{ ok: true }` (optimistic UI already updated the client). Optionally update the server state cache to reflect the change so the next `/api/fans` is consistent without a call.

### `GET /api/health`
Does a lightweight `get_access_token` (or returns cached-token validity) → `{ ok }`.

## Behavior rules (quota-driven)

- **No auto-polling.** Load state on mount and on the refresh button only.
- **Optimistic UI:** apply the change immediately; roll back + toast on error.
- **Debounce** the speed control (~300ms) so a drag = one command.
- After a successful command, **update local + server cache optimistically** instead of re-fetching.
- Disable a fan's controls when `online:false`.
- **Never** call Atomberg from a client component; only via `/api/*`.
- Accessibility: all controls keyboard-operable + labeled; mic button has an ARIA label and a visible listening state.

## Confirm sleep/timer before building those controls
`power`/`speed`/`led` are verified. For **sleep** and **timer**, send one test command via `/api/fans/:id/cmd` and read `/api/fans?refresh=1` back to confirm the command key name (`sleep` vs `sleep_mode`) and the timer value→hours mapping. Details in [docs/10](10-your-devices.md#command-key-names--still-to-confirm). Hide controls you can't confirm.

## Environment variables (server-only)
```
ATOMBERG_API_KEY=...
ATOMBERG_REFRESH_TOKEN=...
# optional: Upstash Redis for cross-invocation cache
# UPSTASH_REDIS_REST_URL=...
# UPSTASH_REDIS_REST_TOKEN=...
# optional: app passcode
# APP_PASSCODE=...
```
Read only in `lib/atomberg.ts` / `lib/cache.ts` / API routes. See [07-security.md](07-security.md).
