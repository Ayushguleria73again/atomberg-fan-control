# First prompt for Antigravity

Open `~/Desktop/atomberg-fan-control` in Antigravity, make sure `AGENTS.md` and `.agents/skills/` are at the project root (see HOW-TO-USE-WITH-ANTIGRAVITY.md), then paste the prompt below.

---

```
Read AGENTS.md and everything in docs/ in full before writing any code.

We are building "FanControl" — a Next.js (App Router, TypeScript) PWA + browser
voice control that talks DIRECTLY to the Atomberg Cloud API to control my 4
Atomberg fans. There is NO Home Assistant in v1 (those docs are a future upgrade
— ignore them). The authoritative build plan is docs/08-roadmap.md.

Non-negotiable rules (from AGENTS.md):
- The browser only ever calls same-origin /api/* routes. Only the Next.js server
  calls Atomberg. Never ship secrets to the client, never use NEXT_PUBLIC_ for a
  secret, never return secrets in a response.
- Read ATOMBERG_API_KEY and ATOMBERG_REFRESH_TOKEN from server env. They are
  already in .env.local (git-ignored) and verified working. Do not print them.
- Respect Atomberg's ~100 calls/day, 5/sec quota. NEVER poll on a timer. Cache
  the access token (refresh on 401) and device state (30–60s TTL); one
  get_device_state?device_id=all call returns all fans. Fetch state on app open
  and on a manual refresh button only. Use optimistic UI after commands instead
  of re-fetching.
- My fans and their verified device IDs, capabilities, and state schema are in
  docs/10-your-devices.md. Only power/speed/led command keys are verified — for
  sleep/timer, send one test command and read state back to confirm the key name
  and mapping before wiring those controls (hide what you can't confirm).

Start with Phase 1 from docs/08-roadmap.md:
1. Scaffold the Next.js app (TypeScript strict, Tailwind, shadcn/ui, TanStack Query).
2. Build lib/atomberg.ts (getAccessToken cached + refresh-on-401, getState with
   TTL cache, sendCommand) and lib/fanMeta.ts from docs/10.
3. Add GET /api/health and GET /api/fans (normalized state, ?refresh=1 forces live).
4. A minimal dashboard listing my 4 fans with their live state, a refresh button,
   and a "last updated" label — read-only for now.

Then STOP and show me the app running so I can confirm it shows my real fans and
state before we add controls (Phase 2). Check in with me at the end of each phase.
Use the atomberg-api, webapp-conventions, and voice-intent skills as needed.
```

---

## Tips
- If Antigravity can't see the skills, ask it: *"What skills are available?"* — if the four don't appear, re-check that `.agents/skills/` is at the project root and restart the session (see HOW-TO-USE-WITH-ANTIGRAVITY.md).
- Keep answering its check-ins after each phase; the roadmap's ✅ gates tell you what "done" looks like for each one.
- When it asks to run the app, that's your cue to test on your phone and (later) try voice.
