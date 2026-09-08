# How to build this with Google Antigravity

This project is designed so that **Antigravity writes all the code** and you steer it. This guide explains how Antigravity's skills/agents system works and exactly how to load this repo into it.

---

## 1. How Antigravity's "skills" and "rules" actually work

Antigravity (Google's agentic IDE, built on the Gemini agent stack) extends the agent in three layers:

| Concept | File / location | When it's used |
|--------|------------------|----------------|
| **Rules** | `AGENTS.md` at project root (and `.agents/rules/`) | Loaded **every** session as persistent context — coding standards, stack, conventions. |
| **Skills** | `.agents/skills/<name>/SKILL.md` (workspace) or `~/.gemini/config/skills/<name>/SKILL.md` (global) | Discovered by description; the **full** `SKILL.md` is read only when the task matches ("progressive disclosure"). |
| **Workflows** | `.agents/workflows/` | A named, repeatable step sequence you invoke for a task. |

### SKILL.md format

Each skill is a folder with a `SKILL.md` file that has YAML frontmatter:

```yaml
---
name: atomberg-api          # optional; defaults to folder name (lowercase-hyphenated)
description: How to authenticate with and call the Atomberg Cloud API to read and control fans. Use whenever writing code that talks to Atomberg or Home Assistant fan entities.
---

# Skill body — full instructions the agent reads when the skill triggers
```

- **`description` is required.** Write it in the third person and pack it with trigger keywords, because Antigravity matches your natural-language request against it to decide whether to load the skill.
- **`name` is optional** and defaults to the folder name.
- A skill folder may also contain `scripts/`, `examples/`, and `resources/` subfolders. The agent reads those files only when the skill tells it to.

> Sources: [Antigravity Skills docs](https://antigravity.google/docs/skills/) · [Authoring Antigravity Skills (Google Codelabs)](https://codelabs.developers.google.com/getting-started-with-antigravity-skills)

---

## 2. Install the skills

This repo ships four ready-made skills in [`antigravity/.agents/skills/`](antigravity/.agents/skills/):

| Skill | Purpose |
|-------|---------|
| `atomberg-api` | Auth flow + endpoints + command payloads for the Atomberg Cloud API |
| `home-assistant` | How to call HA's REST/WebSocket API and map fans to `fan.*` services |
| `voice-intent` | The voice pipeline: Web Speech API + turning speech into fan commands |
| `webapp-conventions` | Next.js structure, the server-side proxy pattern, UI conventions |

**Option A — workspace scope (recommended, keeps them with the project):**

When Antigravity opens this project, the skills folder needs to be at the workspace root. Move the `.agents` folder up one level so it sits next to your code:

```bash
# run from the project root once you scaffold the app here
cp -R antigravity/.agents ./.agents
cp antigravity/AGENTS.md ./AGENTS.md
```

**Option B — global scope (available in every project on your machine):**

```bash
mkdir -p ~/.gemini/config/skills
cp -R antigravity/.agents/skills/* ~/.gemini/config/skills/
```

Then restart Antigravity so it re-scans skills. Ask it to list its skills to confirm they loaded.

---

## 3. Drive the build

1. **Open Antigravity** in `~/Desktop/atomberg-fan-control`.
2. Make sure `AGENTS.md` is at the root (Option A above) so the rules load.
3. Give Antigravity this opening prompt:

   > Read `docs/` and `AGENTS.md` in full. We're building the FanControl app described there — a Next.js web app that controls my Atomberg fans through Home Assistant, with browser voice control. Follow the phased plan in `docs/08-roadmap.md`. Start with Phase 1 and check in after each phase. Don't hardcode any tokens — read them from environment variables as `docs/07-security.md` requires.

4. Antigravity's skills will trigger automatically as it works (e.g. the `atomberg-api` skill activates when it writes the HA/Atomberg calls). You don't invoke them by name.
5. Provide the secrets it asks for via a `.env.local` file (see [docs/07-security.md](docs/07-security.md)) — **never** paste tokens into chat or commit them.

---

## 4. Division of labor

| You (human) | Antigravity |
|-------------|-------------|
| Enable Developer Options in the Atomberg app; copy API key + refresh token | Everything code |
| Install & run Home Assistant; add the Atomberg integration; create a long-lived token | Wire the app to HA |
| Put secrets in `.env.local` | Read them via env vars |
| Test on your phone / say voice commands | Build the UI, voice, and API routes |
| Decide remote-access method (Nabu Casa vs Cloudflare Tunnel) | Configure the app to use whichever URL you provide |

The physical/account steps are collected in [docs/04-home-assistant-setup.md](docs/04-home-assistant-setup.md).
