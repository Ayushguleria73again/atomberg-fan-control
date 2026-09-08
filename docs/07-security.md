# 07 — Security & Secrets

Small personal project, but it controls physical devices and holds tokens that can control your whole Home Assistant. Follow these.

## Secret inventory

| Secret | Where it lives | Never |
|--------|----------------|-------|
| Atomberg API key + refresh token | **Home Assistant** config only (or app server env in no-hub mode) | In the browser, in git, in chat |
| `HA_TOKEN` (long-lived) | App **server** env (`.env.local`, Vercel env vars) | In client code, in `NEXT_PUBLIC_*`, in git |
| `HA_BASE_URL` | App server env | (fine to keep private; not a secret but keep the URL unadvertised) |

## Rules for Antigravity

1. **No secret is ever prefixed `NEXT_PUBLIC_`** and no secret is read from a client component. Only `lib/ha.ts` and API routes read them.
2. **`.env.local` is git-ignored.** Commit a `.env.example` with keys and empty values instead.
3. The browser talks **only** to same-origin `/api/*`. It never receives the HA token or Atomberg creds in any response.
4. Validate every `POST /api/fans/:id/cmd`: check the entity is one of the known fan IDs, the action is in the allowed set, and the value is in range. Reject anything else — don't pass arbitrary input through to HA.
5. Rate-limit / debounce commands server-side too, so a misbehaving client can't spam HA → Atomberg (`429`).

## `.env.example`
```
# Home Assistant (default architecture)
HA_BASE_URL=
HA_TOKEN=

# No-hub direct mode only (optional)
ATOMBERG_API_KEY=
ATOMBERG_REFRESH_TOKEN=
```

## App access control
The app itself controls your fans, so don't leave it fully public:
- **Simplest:** Vercel password protection, or a single shared passcode checked in middleware before any `/api/*` call.
- **Better:** an auth provider (e.g. Clerk / Auth.js) with just your account allowed.
- At minimum, don't publish the URL. For v1, a passcode in middleware is fine; note it as a hardening item.

## Home Assistant hardening
- Access HA via **Nabu Casa** or a **Cloudflare Tunnel** — never a raw port-forward of 8123.
- The long-lived token can control **all** of HA, not just fans. Treat it like a password; rotate it (revoke + recreate in HA profile) if it leaks.
- Consider a dedicated HA user with limited entity exposure for the app, if you want least-privilege.

## Physical-safety sanity
- Confirm destructive-sounding broadcast commands ("turn everything off") only affect fans, not other HA entities — scope broadcasts to the known fan entity list, never `all`.
