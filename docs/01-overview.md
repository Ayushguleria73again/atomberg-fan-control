# 01 — Project Overview

## Goal

Control my Atomberg smart ceiling fans from software I own: a web app that works on my phone and laptop, plus hands-free voice control — without being locked into the Atomberg app or Alexa for the interface.

## Why not just use the Atomberg app / Alexa?

They work, but they're closed. This project gives me:

- **My own UI** — exactly the controls I want, one screen for all fans.
- **Voice on my terms** — say a command to my own web app; no wake-word device required.
- **Automation freedom** — a foundation I can extend (schedules, presence, dashboards, tying fans to other smart devices).
- **A learning project** — a real end-to-end IoT + web + voice build.

## Scope (v1 — what "done" means)

A logged-in web app where I can:

1. See every Atomberg fan and its live state (on/off, speed, online).
2. Toggle power per fan.
3. Set speed (1–6).
4. Start a sleep timer / off-timer (where the model supports it).
5. Toggle the LED / underlight (on LED models).
6. Do all of the above by **voice**: "turn off the living room fan", "bedroom fan speed 4".
7. Use it remotely (not just on home Wi-Fi).

## Out of scope for v1 (candidates for later)

- Multi-user accounts / sharing with family (single owner for v1).
- Native mobile app (the web app is installable as a PWA instead).
- Complex automations, schedules, presence detection.
- Non-Atomberg devices (the hub makes this easy to add later).

## Key decisions (locked in)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Control path | **Direct to Atomberg cloud (no hub)** | Simplest path; no Pi/Home Assistant; works remotely. Must respect the ~100 calls/day quota (no polling + caching). See [02-architecture.md](02-architecture.md). Home Assistant is a documented future upgrade. |
| App type | **Next.js web app (PWA)** | One codebase for phone + desktop; installable; easy deploy. |
| Voice | **Browser Web Speech API** | No extra hardware; runs in the app. See [06-voice-control.md](06-voice-control.md). |
| Fan brand | **Atomberg** | Has a documented public cloud API + existing HA integration. |

## Success criteria

- I can open the app on my phone, tap a fan, and it responds within ~2 seconds.
- The displayed state matches reality when I open the app or hit refresh (no constant polling — see the quota note in [02](02-architecture.md)).
- Saying a natural command changes the right fan.
- No secret (API key, refresh token) is ever exposed to the browser or committed to git.
- A normal day of use stays well under the ~100 API calls/day quota.
