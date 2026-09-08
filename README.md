# FanControl — Custom App & Voice Control for Atomberg Smart Fans

A personal project to control your Atomberg BLDC smart fans from your **own web app** (phone + desktop) and by **voice**, without depending on the Atomberg app / Alexa for the UI.

This repository is a **documentation-first project**. You (the human) don't write the code — **Google Antigravity** does. Everything Antigravity needs to build the app lives in these docs plus the Antigravity **skills** in [`antigravity/`](antigravity/).

---

## The 30-second picture (v1: direct to Atomberg — no hub)

```
Your voice / phone / laptop
        │
        ▼
  ┌───────────────┐                         ┌──────────────┐
  │  FanControl   │   HTTPS (server-side)    │   Atomberg   │
  │  web app      │ ───────────────────────► │   Cloud API  │ ──► Your 4 fans
  │  (Next.js)    │   Bearer token+api-key    │              │
  └───────────────┘                         └──────────────┘
     Web Speech API           (secrets stay on the server)
     (voice → intent)         ~100 API calls/day → cache, don't poll
```

- **The web app is the whole product.** Its Next.js **server** holds your Atomberg API key + refresh token and calls Atomberg's cloud; the browser only ever calls the app's own `/api/*` routes, so secrets never leak.
- **No Home Assistant, no Raspberry Pi.** It talks straight to Atomberg and works from anywhere (control rides Atomberg's cloud).
- **Voice** runs in the browser (Web Speech API) → a small intent parser turns "turn the balcony fan to speed 3" into an API call.
- **One constraint:** Atomberg allows ~100 API calls/day, so the app caches state and never polls. Tradeoff: state can be briefly stale if you use Alexa/the remote.

Full reasoning is in [docs/02-architecture.md](docs/02-architecture.md). Home Assistant remains a documented **future upgrade** ([docs/04](docs/04-home-assistant-setup.md)), not part of v1.

---

## What's in this repo

| Path | What it is |
|------|-----------|
| [docs/01-overview.md](docs/01-overview.md) | Goals, scope, what "done" looks like |
| [docs/02-architecture.md](docs/02-architecture.md) | **System design — direct-to-Atomberg (v1)** + the quota discipline |
| [docs/03-atomberg-api.md](docs/03-atomberg-api.md) | **Verified** Atomberg Cloud API reference |
| [docs/04-home-assistant-setup.md](docs/04-home-assistant-setup.md) | *(future upgrade, not v1)* Home Assistant hub setup |
| [docs/05-webapp-spec.md](docs/05-webapp-spec.md) | The Next.js app: screens, components, API routes, data model |
| [docs/06-voice-control.md](docs/06-voice-control.md) | Voice pipeline: Web Speech API + intent parsing |
| [docs/07-security.md](docs/07-security.md) | Secrets, auth, and safety rules |
| [docs/08-roadmap.md](docs/08-roadmap.md) | Phased build plan for Antigravity to execute |
| [docs/09-antigravity-skills.md](docs/09-antigravity-skills.md) | **How to add skills to Antigravity** (paths, SKILL.md, triggering) |
| [docs/10-your-devices.md](docs/10-your-devices.md) | **Your 4 fans** — live-verified device IDs + confirmed state schema |
| [docs/11-raspberry-pi-haos-walkthrough.md](docs/11-raspberry-pi-haos-walkthrough.md) | *(future upgrade, not v1)* Home Assistant on Raspberry Pi |
| [docs/12-voice-vad-architecture.md](docs/12-voice-vad-architecture.md) | **High-end hands-free voice** — Silero VAD + wake word + on-device Whisper |
| [docs/13-multitenant-byok.md](docs/13-multitenant-byok.md) | **Public product** — multi-tenant BYOK: accounts + per-user Atomberg creds |
| [docs/14-credential-security.md](docs/14-credential-security.md) | **Mandatory security** — encrypting stored user credentials |
| [docs/15-design-system.md](docs/15-design-system.md) | **UI design system** — clean/minimal Apple-like, mobile-first, light+dark |
| [docs/legal/privacy-policy.md](docs/legal/privacy-policy.md) · [terms-of-service.md](docs/legal/terms-of-service.md) | **Legal templates** (fill placeholders + lawyer review before launch) |
| [antigravity/AGENTS.md](antigravity/AGENTS.md) | Project rules Antigravity loads every session |
| [antigravity/.agents/skills/](antigravity/.agents/skills/) | Antigravity skills: `atomberg-api`, `voice-intent`, `webapp-conventions` (+ dormant `home-assistant`) |
| [HOW-TO-USE-WITH-ANTIGRAVITY.md](HOW-TO-USE-WITH-ANTIGRAVITY.md) | **Start here** — how to load these into Antigravity and drive the build |

---

## Running Locally & Deploying

### 1. Local Development
```bash
# 1. Install dependencies
npm install

# 2. Configure .env.local (copy from .env.example)
# ATOMBERG_API_KEY=...
# ATOMBERG_REFRESH_TOKEN=...
# APP_PASSCODE=your_secret_passcode

# 3. Start development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). Enter your `APP_PASSCODE` to unlock the dashboard.

### 2. Deploying to Vercel
1. Push this repository to GitHub.
2. Import project in [Vercel](https://vercel.com).
3. Under **Project Settings → Environment Variables**, add:
   - `ATOMBERG_API_KEY`
   - `ATOMBERG_REFRESH_TOKEN`
   - `APP_PASSCODE` (sets your gate passcode)
4. Deploy! Open the Vercel URL on mobile and tap **Add to Home Screen** to install the PWA.

---

## Status of the technical facts in these docs

- ✅ **Verified** from Atomberg's developer portal and live fan tests: base URL, auth flow, endpoints, `power`, `speed` (1–6), `led`, `sleep` mode, and `timer` presets.
- 🔒 **Security**: All API routes and dashboard views are protected by server-side Edge middleware requiring `APP_PASSCODE` authentication. Secrets remain exclusively on the server.

