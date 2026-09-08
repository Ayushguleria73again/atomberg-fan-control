# AGENTS.md — Project rules for FanControl

Persistent context for every Antigravity session in this project. Read this and `docs/` before writing code.

## What we're building
**A Next.js (App Router, TypeScript) PWA + browser voice control that talks DIRECTLY to the Atomberg Cloud API.** No Home Assistant, no hub. The app's server-side API routes call `api.developer.atomberg-iot.com`. Full spec in `docs/`. Follow the phased plan in `docs/08-roadmap.md`.

> Home Assistant docs (`docs/04`, `docs/11`, the `home-assistant` skill) are a **future upgrade path only — NOT used in v1.** Ignore them unless the user explicitly switches back.

## Architecture rules (non-negotiable)
- The **browser talks only to same-origin `/api/*`.** It never calls Atomberg directly (that would leak the API key and hit CORS).
- The **Next.js server** holds the Atomberg credentials and calls the cloud API. See `docs/03-atomberg-api.md` and the `atomberg-api` skill.
- Respect the **~100 calls/day, 5/sec** quota. This shapes the whole design (see below).

## The quota discipline (most important rule)
- **Never auto-poll** the Atomberg API on a timer.
- Cache the **access token** server-side; refresh only on `401`.
- Cache **device state** server-side with a short TTL (30–60s). Serve `/api/fans` from cache within the TTL; only call `get_device_state?device_id=all` (one call returns all fans) on a cache miss or an explicit user refresh.
- Send a cloud command only on an actual user action. Use **optimistic UI** so we don't re-fetch state after every command.
- Coalesce/debounce rapid speed changes (~300ms).

## Secrets (see docs/07-security.md)
- Read `ATOMBERG_API_KEY` and `ATOMBERG_REFRESH_TOKEN` from **server env only** (they're in `.env.local`).
- **Never** prefix a secret with `NEXT_PUBLIC_`; never read secrets in a client component; never return them in an API response.
- `.env.local` is git-ignored; keep `.env.example` with empty values.
- Validate all command input server-side (known device IDs, allowed actions, in-range values).

## Stack conventions
- TypeScript (strict), Tailwind CSS, shadcn/ui where helpful, TanStack Query for fetching + optimistic updates.
- Server-only Atomberg client in `lib/atomberg.ts`; no `"use client"` there.
- Speed is **1–6** (integer). Map to a 0–100% slider only for display if desired.
- Deploy target: **Vercel** (server env vars hold Atomberg creds). Works remotely with no LAN dependency.

## Behavior conventions
- Optimistic UI with rollback + toast on error.
- Show a "last refreshed" timestamp; provide a manual refresh button (since we don't poll).
- Confirmed capabilities on the user's R2/renesa+ fans: power, speed 1–6, LED, sleep, timer (see `docs/10-your-devices.md`).
- "Turn everything off" iterates the known device list — never a wildcard.

## Verification
- After each phase, confirm against the ✅ gates in `docs/08-roadmap.md` with the real fans.
- Only `power`/`speed`/`led` command keys are verified. For `sleep`/`timer`, send one test command and read `get_device_state` back to confirm the key name + value mapping before wiring the UI (see `docs/10-your-devices.md`).

## Skills available in this project
`.agents/skills/`: `atomberg-api` (primary — the cloud API), `voice-intent` (voice pipeline), `webapp-conventions` (app structure). The `home-assistant` skill is dormant (v1 doesn't use it).
