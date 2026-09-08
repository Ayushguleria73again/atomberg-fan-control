---
name: home-assistant
description: DORMANT / NOT USED IN v1. Reference only for a future upgrade where the FanControl app is re-pointed from the Atomberg cloud to a Home Assistant hub for instant local state and no daily API cap. Do not use this skill for the current build — v1 talks directly to the Atomberg cloud (see the atomberg-api and webapp-conventions skills). Only consult this if the user explicitly decides to switch to Home Assistant.
---

# Home Assistant client (FUTURE UPGRADE — not used in v1)

> **v1 does NOT use Home Assistant.** The app talks directly to the Atomberg cloud. This skill is kept only for the optional future migration described in `docs/04-home-assistant-setup.md` and `docs/11-raspberry-pi-haos-walkthrough.md`. Ignore it for the current build.

If/when migrating to a hub, the app keeps the same `/api/*` contract and only `lib/atomberg.ts` is swapped for an HA client that:
- Auths to HA with a long-lived token (`HA_BASE_URL`, `HA_TOKEN`, server-side).
- Reads state from `GET {HA}/api/states` (entities `fan.*`).
- Sends commands via `POST {HA}/api/services/fan/{turn_on|turn_off|set_percentage}`.
- Optionally subscribes to HA's WebSocket `state_changed` for live updates (the main reason to upgrade).

Full detail lived in earlier drafts and in `docs/04-home-assistant-setup.md`. Do not scaffold any of this unless the user switches architectures.
