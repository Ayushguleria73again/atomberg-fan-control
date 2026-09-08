# 14 — Credential Security (mandatory)

This app stores **other people's home-control credentials**. Every item here is a hard requirement for the multi-tenant build ([docs/13](13-multitenant-byok.md)). If any one can't be met, don't launch publicly — ship the open-source self-host model instead.

## Threat model (what we're defending against)
- **DB breach / leaked backup** → attacker gets ciphertext, not usable tokens (encryption at rest).
- **App/log compromise** → no plaintext token ever written to logs, errors, or analytics.
- **XSS / malicious dependency** → tokens never exist in client-side code or responses.
- **Broken access control** → user A can never read or command user B's devices.
- **Master-key compromise** → key stored separately from the DB, rotatable.

## 1. Encryption at rest — AES-256-GCM

Use authenticated encryption. Never store either secret in plaintext.

```ts
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const KEY = Buffer.from(process.env.CREDENTIAL_ENCRYPTION_KEY!, "base64"); // 32 bytes

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);                              // 96-bit nonce per record
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: ct.toString("base64"), iv: iv.toString("base64"), authTag: tag.toString("base64") };
}

export function decryptSecret(rec: { ciphertext: string; iv: string; authTag: string }) {
  const d = createDecipheriv("aes-256-gcm", KEY, Buffer.from(rec.iv, "base64"));
  d.setAuthTag(Buffer.from(rec.authTag, "base64"));
  return Buffer.concat([d.update(Buffer.from(rec.ciphertext, "base64")), d.final()]).toString("utf8");
}
```

Rules:
- **Fresh random IV per record and per re-encryption.** Never reuse an IV with the same key.
- Encrypt the **api key and refresh token separately** (or as one JSON blob) — both are secret.
- Store a `key_version` so you can rotate the master key.
- Decrypt **only** in the server request that proxies to Atomberg; hold plaintext in a local variable, never in module scope, and let it go out of scope immediately.

## 2. Master key management
- `CREDENTIAL_ENCRYPTION_KEY` = 32 random bytes, base64, in Vercel **server** env (Production + Preview separate values). Generate with `openssl rand -base64 32`.
- It is **not** in the database and **not** in the repo. A DB dump alone must be useless without it.
- Plan rotation: add a new key version, re-encrypt records lazily on next use, retire the old version.
- Upgrade path: a KMS (e.g. cloud KMS / envelope encryption) instead of a raw env key once you have real users.

## 3. No plaintext anywhere else
- **Never log** the key/token — not in `console.log`, error objects, Sentry breadcrumbs, request logs, or analytics. Scrub before logging.
- **Never return** them in any API response (return fan state only).
- **Never** put them in a `NEXT_PUBLIC_` var, a client component, a URL/query string, or a cookie readable by JS.
- Redact from error messages surfaced to the client.

## 4. Access control (ownership)
- Every `/api/*` route requires an authenticated session.
- `POST /api/fans/:id/cmd`: verify the `:id` is in **this user's** device list (from their own Atomberg account) before acting. Reject cross-tenant device IDs with 403.
- Never trust a device ID from the client without checking ownership.

## 5. Sessions & CSRF
- Sessions via the auth provider (Clerk/Auth.js): httpOnly, Secure, SameSite cookies.
- CSRF protection on all state-changing routes (`/api/connect`, `/api/fans/:id/cmd`). Auth.js/Clerk provide patterns; enforce same-site + a CSRF token for form posts.

## 6. Rate limiting & abuse
- Rate-limit `/api/connect` (credential submission) and command endpoints per user/IP (Upstash Redis ratelimit).
- Validate creds with a single Atomberg `get_access_token` before storing; reject invalid without ret[ry storms.
- Remember each user's own Atomberg quota is ~100/day — cache per user; surface a friendly "rate limited by Atomberg" on 429.

## 7. Data lifecycle & privacy
- **Disconnect**: delete the user's `atomberg_connections` row on request.
- **Delete account**: remove the user and all their connections; confirm deletion.
- **Data minimization**: store only what you need (encrypted creds, maybe cached device names). Don't hoard.
- Publish a **privacy policy** (what you store, that creds are encrypted, how to delete) and **terms of service** before public launch.

## 8. Dependency & platform hygiene
- Pin dependencies; watch for supply-chain advisories (a malicious dep could exfiltrate decrypted tokens).
- Keep the encryption/auth code small and reviewed.
- Consider a security review before launch (this repo ships a `security-review` skill).

## Launch checklist (all must be ✅)
- [ ] Creds encrypted at rest (AES-256-GCM), master key in env/KMS, not in DB/repo.
- [ ] No token in any log, response, client bundle, or URL.
- [ ] Ownership checks on every device action.
- [ ] Auth on every `/api/*`; CSRF on mutations; rate limits in place.
- [ ] Disconnect + delete-account implemented.
- [ ] Privacy policy + ToS published.
- [ ] Atomberg developer ToS verified to allow a hosted multi-tenant proxy.
