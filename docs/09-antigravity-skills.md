# 09 — How to Add Skills to Antigravity (reference)

This is the authoritative "how do skills work" reference, from Google's official docs and codelab. The project-specific loading steps are in [HOW-TO-USE-WITH-ANTIGRAVITY.md](../HOW-TO-USE-WITH-ANTIGRAVITY.md); this is the general mechanism.

## The three extension layers

| Layer | File / location | Loaded |
|-------|-----------------|--------|
| **Rules** | `AGENTS.md` (project root), `.agents/rules/` | Always, as persistent context |
| **Skills** | `.agents/skills/<name>/SKILL.md` (workspace) or `~/.gemini/config/skills/<name>/SKILL.md` (global) | On demand, when the description matches your request |
| **Workflows** | `.agents/workflows/` | When you invoke the workflow |

## Where skills live (this trips people up)

| Scope | Path | Recognized by |
|-------|------|---------------|
| **Workspace** | `<project-root>/.agents/skills/<name>/` | Antigravity IDE for that project (also legacy `.agent/skills/`) |
| **Global** | `~/.gemini/config/skills/<name>/` | **All** Antigravity products (IDE, app, CLI) — the safest global location |
| Antigravity **CLI** global (alt) | `~/.gemini/antigravity-cli/skills/` | CLI specifically |

> If in doubt, use `~/.gemini/config/skills/` for global or `<project>/.agents/skills/` for project-scoped. After adding files, **restart the Antigravity session** so it re-scans.

## Anatomy of a skill

```
my-skill/
├── SKILL.md          # required
├── scripts/          # optional: run.py, util.sh, ...
├── examples/         # optional: sample inputs/outputs
├── resources/        # optional: templates, reference docs
└── assets/           # optional: images
```

### SKILL.md

```yaml
---
name: my-skill                 # optional; defaults to folder name (lowercase-hyphens)
description: Third-person, keyword-rich summary of WHAT it does and WHEN to use it.
---

# Skill Title

## Goal
What this accomplishes.

## Instructions
1. Step-by-step procedure.
2. Reference a helper: `python scripts/run.py "<arg>"`.

## Examples
Input → output.

## Do not use when
Narrow the triggering so it doesn't over-activate.
```

**Rules that matter:**
- `description` is **required** and is the *only* thing the agent sees at first — write it in the third person, packed with trigger keywords, specific ("Executes read-only SQL against local Postgres") not vague ("database helper").
- `name` is optional (defaults to the folder name).
- Keep the body concise; push long examples into `examples/`/`resources/` so the context stays small.
- Add a "Do not use when" section to prevent over-triggering.

## How triggering works (progressive disclosure)

1. On session start, Antigravity indexes only the **frontmatter** (name + description) of every skill — a lightweight menu.
2. It **semantically matches** your natural-language request against those descriptions.
3. When a skill is relevant, it reads the **full SKILL.md body** and follows it.
4. You don't name skills explicitly — good descriptions do the work.

## Adding a skill — the steps

1. Create the folder + `SKILL.md` in a workspace or global path above.
2. (Optional) add `scripts/`, `examples/`, `resources/`.
3. **Restart** the Antigravity session so it re-detects skills.
4. **Verify:**
   - IDE / app: ask the agent "What skills are available?"
   - CLI: run `/skills`.

No registration/manifest is needed — placement + restart is enough.

## Sources
- [Skills | Google Antigravity Docs](https://antigravity.google/docs/skills/)
- [Authoring Google Antigravity Skills — Google Codelabs](https://codelabs.developers.google.com/getting-started-with-antigravity-skills)
- [Skills Made Easy with Antigravity & Gemini CLI (Google Cloud Community)](https://medium.com/google-cloud/skills-made-easy-with-google-antigravity-and-gemini-cli-5435139b0af8)
- [Where does Antigravity look for Agent Skills? — Mete Atamel](https://atamel.dev/posts/2026/07-01_where_agy_agent_skills/)
- [Antigravity + AGENTS.md guide — The Prompt Shelf](https://thepromptshelf.dev/blog/google-antigravity-agents-md-rules-guide-2026/)
