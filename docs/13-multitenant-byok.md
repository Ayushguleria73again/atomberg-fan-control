# 13 — Multi-Tenant "Bring Your Own Key" Product Architecture

> **Product pivot.** FanControl becomes a **public app**: anyone signs up, connects their own Atomberg account (their API key + refresh token), and controls their own fans. Chosen model: **user accounts + encrypted credential storage in a database.** This supersedes the single-tenant design in [docs/02](02-architecture.md) for the public product (that doc still describes the simpler personal build).

## ⚠️ Read this first — you are now a custodian of home-control credentials

Storing other people's Atomberg refresh tokens means a breach of your app = attackers can control strangers' homes. This is not a normal CRUD app. The security requirements below (encryption at rest, no logging, ownership checks, account deletion) are **mandatory, not optional**. Treat every rule in [docs/14-credential-security.md](14-credential-security.md) as a hard requirement.

Also unresolved (flagged, not yet checked):
- **Atomberg developer ToS.** Their keys are issued per-account for that account's devices. Self-hosted tools (HA/Homebridge) keep the key on the user's machine; **a hosted service that stores and proxies many users' tokens is a different arrangement.** Verify Atomberg's developer terms permit this before any public launch. If they don't, fall back to the open-source self-host model ([docs/02](02-architecture.md) shipped per-user).
- **Privacy/PII law.** You'll hold emails + sensitive credentials → you need a privacy policy, a way to delete accounts/data, and (for EU users) GDPR-style handling.

## System diagram

```
  Visitor ──sign up / log in──►  ┌──────────────────────────────────────────┐
                                 │  FanControl (Next.js on Vercel)           │
  Connect Atomberg (key+token) ► │                                           │
                                 │  Auth (sessions)   ┌────────────────────┐ │
                                 │  ─────────────────►│  Encrypt (AES-256- │ │
                                 │                    │  GCM) then store   │ │
                                 │  /api/fans         └─────────┬──────────┘ │
                                 │  /api/fans/:id/cmd           │            │
                                 │      │ decrypt in memory ◄───┘            │
                                 └──────┼─────────────────────────┬─────────┘
                                        │                         │
                              ┌─────────▼─────────┐     ┌─────────▼─────────┐
                              │  Postgres (Neon)  │     │  Atomberg Cloud   │
                              │  users +          │     │  (per-user key)   │──► that user's fans
                              │  ENCRYPTED creds  │     └───────────────────┘
                              └───────────────────┘
```

Each user's requests use **their own** Atomberg key → **their own** ~100/day quota. Multi-tenancy doesn't share a quota.

## Recommended stack

| Concern | Recommendation | Notes |
|---------|----------------|-------|
| Framework | Next.js (App Router) | keep what we have |
| **Auth / accounts** | ✅ **Clerk** (Vercel Marketplace) — LOCKED | hosted sign-up/login, sessions, MFA, social logins. Identity only; the encrypted Atomberg creds still live in your Neon DB. |
| **Database** | ✅ **Neon Postgres** (Vercel Marketplace) — LOCKED | serverless Postgres; provision via `vercel integration`; use Drizzle or Prisma ORM |
| Credential encryption | **AES-256-GCM** (Node `crypto`), key in env/KMS | see [docs/14](14-credential-security.md) — the core of this build |
| Per-user cache | Upstash Redis, keyed by userId | preserves each user's quota discipline |
| Deploy | Vercel | provision DB + auth via **Vercel Marketplace** (`vercel integration` / the marketplace skill) |

> **Provisioning:** when Antigravity builds this, it should provision the database and auth through the **Vercel Marketplace** (load the `marketplace` skill / `vercel integration`) rather than hand-rolling infra or hardcoding a provider SDK.

## Data model (minimum)

```
users
  id (pk)            -- from the auth provider
  email
  created_at

atomberg_connections
  id (pk)
  user_id (fk → users.id, unique)   -- one Atomberg account per user for v1
  enc_api_key        -- ciphertext (never plaintext)
  enc_refresh_token  -- ciphertext
  iv                 -- per-record nonce
  auth_tag           -- GCM auth tag
  key_version        -- which master key encrypted this (for rotation)
  created_at
  last_used_at
  -- NEVER a plaintext column for either secret
```

Optionally cache the user's device list (device_ids, names) to avoid repeated `get_list_of_devices` — but treat even device IDs as user data.

## Credential lifecycle

1. **Connect:** user submits API key + refresh token on `/connect`.
2. **Validate before storing:** server calls Atomberg `get_access_token` with them; reject if invalid (wrong key/expired token) with a clear error — don't store bad creds.
3. **Encrypt & store:** AES-256-GCM with the server master key → store ciphertext/iv/tag against `user_id`. Wipe plaintext from memory.
4. **Use:** on `/api/fans` or a command, load the logged-in user's record, **decrypt in memory only**, call Atomberg, discard the plaintext. Never log it, never return it.
5. **Disconnect:** user can remove their Atomberg connection → delete the row.
6. **Delete account:** removes the user + all connections (data-deletion requirement).

## API routes (now user-scoped)

- `POST /api/connect` — validate + encrypt + store the caller's Atomberg creds. Auth required.
- `DELETE /api/connect` — remove the caller's stored creds.
- `GET /api/fans` — resolve caller → decrypt → Atomberg `get_device_state?device_id=all` (cached per user). Auth required.
- `POST /api/fans/:id/cmd` — **ownership check**: the `id` must belong to the caller's own device list; then decrypt → `send_command`. Auth required.
- All routes: reject unauthenticated requests; never accept a device/command for a user who doesn't own it.

## What carries over from the personal build
- The Atomberg API client logic ([docs/03](03-atomberg-api.md)) — but creds now come from the decrypted per-user record instead of env.
- The quota discipline ([docs/02](02-architecture.md#the-one-real-constraint-100-api-callsday)) — now **per user**, cache keyed by userId.
- The UI, controls, voice, and VAD — unchanged; they just operate on "the logged-in user's fans."
- The old `APP_PASSCODE` gate is **replaced** by real accounts.

## Migration from the current single-tenant app
1. Add auth + DB + encryption (new phases in [docs/08](08-roadmap.md#multi-tenant-product-track)).
2. Move Atomberg creds out of env into the per-user connection flow (your own account becomes user #1; you connect via `/connect` like anyone else).
3. Remove `ATOMBERG_API_KEY`/`ATOMBERG_REFRESH_TOKEN` and `APP_PASSCODE` from server env once accounts work.
4. Add legal pages (privacy, ToS) and account-deletion before public launch.

## Non-negotiables (see docs/14)
- Credentials encrypted at rest (AES-256-GCM), master key in env/KMS, **never** committed or logged.
- Ownership checks on every device action.
- No secret ever reaches the client or a log line.
- Account + data deletion available.
- Rate-limit auth and command endpoints.
- Verify Atomberg's ToS + publish a privacy policy before going public.
