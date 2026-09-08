# 08 — Build Roadmap (Direct-to-Atomberg, v1)

Phased plan for Antigravity. Complete and verify each phase (✅ gate) before the next. No Home Assistant in v1.

## Phase 0 — Prereqs (mostly done)
- [x] Atomberg Developer Options enabled; API key + refresh token saved in `.env.local`.
- [x] Credentials verified; 4 fans + confirmed state schema captured in [docs/10](10-your-devices.md).
- [ ] (Optional) rename fans in the Atomberg app for clean, distinct voice names.
- ✅ **Gate:** `.env.local` has `ATOMBERG_API_KEY` + `ATOMBERG_REFRESH_TOKEN`. (It does.)

## Phase 1 — Scaffold + server Atomberg client
- [ ] Create Next.js (App Router, TS, Tailwind) app in this repo.
- [ ] `lib/atomberg.ts`: `getAccessToken` (cached, refresh on 401), `getState` (all devices, TTL cache), `sendCommand`.
- [ ] `lib/fanMeta.ts`: the 4 device IDs + friendly names + capability flags (from [docs/10](10-your-devices.md)).
- [ ] `GET /api/health` and `GET /api/fans` (returns normalized state).
- [ ] Minimal dashboard listing the 4 fans + live state (read-only) with a refresh button and "last updated" label.
- ✅ **Gate:** the app shows your 4 fans with correct current state; refresh works; no secret reaches the browser.

## Phase 2 — Control
- [ ] `POST /api/fans/:id/cmd` with validation → `sendCommand`.
- [ ] `FanCard` with power toggle + 1–6 speed control; optimistic UI; debounce; error toasts.
- [ ] LED toggle (fans support it).
- [ ] Confirm `sleep` + `timer` command keys via a test command, then add SleepToggle + TimerMenu (hide if unconfirmed).
- ✅ **Gate:** power, speed, and LED work on the real fans from the app; state stays consistent without extra API calls (optimistic + cache).

## Phase 3 — Polish + PWA
- [ ] Loading/pending/offline/error states; disable controls when a fan is offline.
- [ ] "Turn everything off" (iterates known device list).
- [ ] PWA: `manifest.json` + service worker + icons so it installs on the phone.
- [ ] Quota safety review: confirm nothing polls on a timer; verify call count during a heavy session stays low.
- ✅ **Gate:** installable on the phone; a normal day of use stays well under 100 API calls.

## Phase 4 — Voice
- [ ] `VoiceButton` using Web Speech API (feature-detected; graceful fallback). ([06](06-voice-control.md))
- [ ] `lib/intents.ts` rule-based parser: resolve fan via alias map → action/value.
- [ ] Wire intent → existing `/api/fans/:id/cmd`.
- [ ] Transcript display + toast/spoken confirmation; "everything off" scoped to known fans.
- ✅ **Gate:** you control the fans by voice on your phone.

## Phase 5 — Deploy + harden
- [ ] App access control (passcode middleware or auth provider). ([07](07-security.md))
- [ ] `.env.example` current; `.env.local` git-ignored; README run instructions.
- [ ] Deploy to Vercel with `ATOMBERG_*` env vars; (optional) add Upstash Redis for the cache.
- [ ] Confirm control works from mobile data (not just home Wi-Fi) — it should, since it's all via Atomberg's cloud.
- ✅ **Gate:** installed PWA controls the fans by touch + voice, from anywhere, with no secrets exposed.

## Phase 6 — High-end hands-free voice (VAD) — optional upgrade
Design: [docs/12-voice-vad-architecture.md](12-voice-vad-architecture.md); build with the `vad-pipeline` skill. Do this after Phase 5 (needs HTTPS + deploy for a real test).
Chosen stack: **fully on-device + free** (no audio leaves the browser). Details in the doc / `vad-pipeline` skill.
- [ ] Add Silero VAD (`@ricky0123/vad-web`) for on-device endpointing; a "hands-free mode" toggle starts/stops it.
- [ ] Expose the 5 VAD tuning params in `/settings`; tune against the real fans (noisy room).
- [ ] On-device transcription with **Transformers.js Whisper** (`Xenova/whisper-base.en`, WebGPU → WASM fallback; `tiny.en` on weak phones). No API key, no server route. Show a one-time "downloading voice model" state.
- [ ] **"Hey Fan" software wake word:** match the wake prefix on the on-device transcript, strip it, pass the rest on. (openWakeWord as a low-power alternative later.)
- [ ] Route the command text through the existing `lib/intents.ts` + `/api/fans/:id/cmd`.
- [ ] Pause the listen loop during TTS (barge-in); clear listening indicator; transcript display.
- [ ] Graceful fallback where WebGPU/on-device can't cope (iOS Safari): Web Speech API, or optional Groq free-tier via a server route.
- ✅ **Gate:** hands-free — I say "Hey Fan, turn on the balcony fan" with no button and the right fan responds within ~1s, robust to fan/background noise, with no audio leaving the device.

## Definition of done
Matches [01-overview.md](01-overview.md#success-criteria): fast, correct state, working voice, zero leaked secrets, comfortably within the API quota. (Phase 6 hands-free voice is an optional enhancement beyond the v1 bar.)

## Future upgrade (not v1)
If stale-state-after-Alexa/remote ever bothers you, add the **Home Assistant** hub ([04](04-home-assistant-setup.md) / [11](11-raspberry-pi-haos-walkthrough.md)) for instant local state and no daily-call cap. The app's `/api/*` contract barely changes — only `lib/atomberg.ts` gets swapped for an HA client.

---

## Multi-tenant product track

Turns the personal app into a **public BYOK product**: accounts + encrypted per-user Atomberg credentials. Design: [docs/13](13-multitenant-byok.md); security requirements (mandatory): [docs/14](14-credential-security.md). Build with the `multitenant-byok` skill. **Do the security work in the same phase as the feature — not after.**

### Phase A — Auth + database
- [ ] Provision auth (Clerk or Auth.js) + Neon Postgres via **Vercel Marketplace** (`vercel integration` / marketplace skill).
- [ ] Sign up / log in / log out; protected app shell. Replace the `APP_PASSCODE` gate.
- [ ] `users` + `atomberg_connections` schema (no plaintext secret columns).
- ✅ **Gate:** a new user can register and reach an empty "connect your fans" state.

### Phase B — Encrypted credential connect flow
- [ ] `CREDENTIAL_ENCRYPTION_KEY` (32B base64) in env; `encryptSecret`/`decryptSecret` (AES-256-GCM) per [docs/14](14-credential-security.md).
- [ ] `/connect`: validate creds via Atomberg `get_access_token` → encrypt → store under the user. `DELETE /api/connect` to disconnect.
- [ ] Never log/return secrets; scrub errors.
- ✅ **Gate:** I connect my Atomberg account; the DB holds only ciphertext; my fans load.

### Phase C — User-scoped control + isolation
- [ ] `/api/fans` + `/api/fans/:id/cmd` resolve the caller's decrypted creds; per-user cache (Upstash) for quota.
- [ ] **Ownership checks**: reject any device ID not in the caller's own list (403). Verify user A cannot see/command user B's fans.
- [ ] Rate-limit `/api/connect` and command routes.
- ✅ **Gate:** two test accounts are fully isolated; each controls only its own fans within its own ~100/day quota.

### Phase D — Launch readiness
- [ ] Account deletion (removes user + connections); disconnect flow.
- [ ] Privacy policy + ToS pages.
- [ ] Remove `ATOMBERG_*` and `APP_PASSCODE` from server env (creds now per-user).
- [ ] Run the `security-review` skill; consider `/code-review ultra`.
- [ ] **Verify Atomberg's developer ToS permits a hosted multi-tenant proxy** ([docs/13](13-multitenant-byok.md), [docs/14](14-credential-security.md)).
- ✅ **Gate:** launch checklist in [docs/14](14-credential-security.md#launch-checklist-all-must-be-) fully green.
