# 02 — Architecture (Direct-to-Atomberg, v1)

> **This is the v1 architecture: the app talks straight to the Atomberg Cloud API. No Home Assistant, no Raspberry Pi.** The Home Assistant hub is documented separately ([04](04-home-assistant-setup.md)) as an optional future upgrade — skip it for v1.

## System diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  CLIENT (browser / installed PWA on phone or laptop)                  │
│                                                                       │
│   ┌──────────────┐     ┌───────────────┐     ┌────────────────────┐   │
│   │ Fan dashboard│     │ Voice button  │     │ State (fetch on open │   │
│   │ UI (React)   │     │ Web Speech API│     │ + manual refresh)   │   │
│   └──────┬───────┘     └──────┬────────┘     └─────────┬──────────┘   │
│          │  intent parser: speech → { deviceId, action, value }        │
└──────────┼────────────────────┼────────────────────────┼─────────────┘
           │  fetch('/api/...')   (same-origin; NO secrets in browser)    
┌──────────▼────────────────────▼────────────────────────▼─────────────┐
│  SERVER — Next.js API routes (Vercel)                                 │
│   • Holds ATOMBERG_API_KEY + ATOMBERG_REFRESH_TOKEN (server env)      │
│   • Caches the access token (refresh on 401)                          │
│   • Caches device state with a short TTL (avoid the 100/day cap)      │
│   • GET  /api/fans          → list + state (from cache or 1 API call) │
│   • POST /api/fans/:id/cmd  → power / speed / led / sleep / timer     │
└──────────────────────────────┬────────────────────────────────────────┘
              HTTPS  (Bearer access token + x-api-key)
┌──────────────────────────────▼────────────────────────────────────────┐
│  ATOMBERG CLOUD  (api.developer.atomberg-iot.com)                     │
│   get_access_token · get_list_of_devices · get_device_state ·         │
│   send_command                    Quota: ~100 calls/day, 5/sec        │
└──────────────────────────────┬────────────────────────────────────────┘
                          Wi-Fi (Atomberg's servers → your fans)
                    ┌───────────▼──────────┐
                    │  Your 4 Atomberg fans│
                    └──────────────────────┘
```

## Why this design

- **Simplest path to a working app.** No hub, no Pi, no LAN setup. Deploy the Next.js app to Vercel and it controls your fans from anywhere — Atomberg's cloud is the bridge.
- **Secrets stay server-side.** The browser only ever calls same-origin `/api/*`. The API key/refresh token live in Vercel env vars, never shipped to the client. This also sidesteps CORS (Atomberg's API isn't meant to be called from a browser).
- **Works remotely by default.** Because control goes through Atomberg's cloud, there's no "am I on home Wi-Fi?" question — it works the same everywhere.

## The one real constraint: ~100 API calls/day

Everything about the data flow is shaped by staying under the quota. The rules (also in [AGENTS.md](../antigravity/AGENTS.md)):

1. **No timed polling.** Ever.
2. **Cache the access token** server-side; only re-fetch on a `401`.
3. **Cache device state** with a 30–60s TTL. `get_device_state?device_id=all` returns **all four fans in one call**, so a full refresh costs just 1 call. Serve repeated `/api/fans` requests from cache within the TTL.
4. **Fetch state on app open + on a manual "refresh" button**, not continuously.
5. **Commands** cost 1 call each and happen only on user action. Use **optimistic UI** — flip the control immediately, don't re-fetch afterward.
6. **Debounce** the speed control so a drag sends one command, not ten.

Rough daily budget for one household: ~10 state refreshes + ~30 commands = ~40 calls. Comfortably under 100.

**Accepted tradeoff:** if a fan is changed by Alexa or the wall remote, the app shows stale state until the next refresh (cache expiry or the refresh button). Fine for v1. (If this ever annoys you, that's exactly what the Home Assistant upgrade fixes — instant local state.)

## Where state lives (server cache)

Next.js on Vercel is serverless, so a plain in-memory variable isn't guaranteed to persist across invocations. Two options:

- **v1 simple:** module-level in-memory cache. Fluid Compute keeps instances warm, so this mostly works; worst case is an extra state call after a cold start. Good enough to start.
- **Robust:** a tiny **Upstash Redis** (free tier, via Vercel Marketplace) to hold the cached access token + last device state across invocations. Recommended once the app is real, so cold starts never waste calls or re-auth.

## Data flow: one command, end to end

**"Set the balcony fan to speed 3" (voice)**
1. Browser Web Speech API → text `"set balcony fan to speed 3"`.
2. Client intent parser → `{ deviceId: "3844be560e10", action: "speed", value: 3 }`.
3. `POST /api/fans/3844be560e10/cmd` `{ action:"speed", value:3 }` (same-origin, no secret).
4. Server validates, ensures a fresh access token, calls Atomberg
   `POST /v1/send_command { device_id, command: { speed: 3 } }`.
5. Optimistic UI already shows speed 3; server returns success; toast confirms.

## Component responsibilities

| Component | Owns | Never does |
|-----------|------|-----------|
| **Browser client** | UI, voice capture, intent parsing, optimistic updates | Hold secrets; call Atomberg directly |
| **Next.js API routes** | Atomberg auth + token/state caching, validation, quota discipline | Poll on a timer; leak secrets |
| **Atomberg cloud** | The actual fan control | (n/a) |

## Deployment
- **Vercel.** Set `ATOMBERG_API_KEY` and `ATOMBERG_REFRESH_TOKEN` as server env vars (Production + Preview). Optionally add Upstash Redis for the cache.
- Add simple app access control so the URL isn't wide open ([07-security.md](07-security.md)).
