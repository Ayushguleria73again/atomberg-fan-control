---
name: voice-intent
description: How to build the browser voice-control pipeline for the fan app — capturing speech with the Web Speech API (SpeechRecognition), then parsing the transcript into a structured fan command (entity + action + value) with a rule-based parser and optional server-side LLM fallback. Use when implementing the mic button, speech capture, or turning spoken phrases into fan commands. Do not use for the actual HTTP command dispatch — that goes through the home-assistant skill's /api/fans/:id/cmd route.
---

# Voice intent pipeline

Full detail: `docs/06-voice-control.md`. Flow: mic → SpeechRecognition → `lib/intents.ts` → `POST /api/fans/:id/cmd`.

## Speech capture (client component)
```ts
const Rec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
if (!Rec) { /* feature-unsupported: hide mic, offer text input */ }
const r = new Rec();
r.lang = userLang ?? "en-IN";
r.interimResults = false;
r.maxAlternatives = 3;
r.onresult = (e) => onTranscript(e.results[0][0].transcript);
r.onerror = (e) => toast("Voice error: " + e.error);
r.start();                          // tap-to-start, listen for one utterance, then stop
```
- HTTPS only. Prompt/handle mic permission. Best on Chrome/Edge (desktop + Android); degrade on iOS/Safari.
- Push-to-talk (tap to start, one utterance) — not always-listening.

## Intent shape
```ts
type Intent =
  | { entity: string; action: "power"; value: boolean }
  | { entity: string; action: "speed"; value: number }   // 1..6
  | { entity: string; action: "led";   value: boolean }
  | { entity: string; action: "timer"; value: number }
  | { type: "broadcast"; action: "power"; value: boolean } // "turn everything off"
  | { type: "unknown"; transcript: string };
```

## Rule-based parser (lib/intents.ts) — build this first
1. **Resolve fan** from an alias map against the live fan list:
   ```ts
   const aliases = { "fan.living_room": ["living room","hall","lounge"], "fan.bedroom": ["bedroom","room"] };
   ```
   One fan total → default to it. Ambiguous → return a clarify prompt.
2. **Detect action/value** (parse spoken numbers "three"→3):
   - on/switch on/start → `power:true`; off/switch off/stop → `power:false`
   - "speed N" / "set to N" / "level N" → `speed:N` (clamp 1–6)
   - faster/increase → `speed: current+1`; slower/decrease → `speed: current-1`
   - max/full/fastest → `speed:6`
   - light/led/lamp on|off → `led:true|false`
   - "everything"/"all fans" + off/on → `broadcast`
   - "timer N hours" / "off in N" → `timer` preset
3. No match → `unknown` (optionally hand to LLM fallback).

## Optional LLM fallback (server-side only)
For fuzzy phrases ("it's hot" → max). Send transcript + fan list + allowed actions to a model in an API route; expect the `Intent` JSON back. Keep behind a setting; never put a model key in the browser.

## Feedback
- Show recognized transcript.
- Confirm with a toast and optionally `speechSynthesis.speak(...)`.
- `unknown` → "I didn't catch a fan and an action" + examples.

## Constraints / Do not
- Never send raw audio to the server — transcribe in the browser, send only text/intent.
- Only listen while the button is active; stop after one utterance.
- `broadcast` must target the known fan entity list only.
- Reuse the existing `/api/fans/:id/cmd` route; don't create a second command path.
