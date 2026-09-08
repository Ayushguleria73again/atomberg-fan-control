# 06 — Voice Control

Voice runs **in the browser** using the Web Speech API — no extra hardware, no wake-word device. The flow:

```
Mic button → SpeechRecognition (speech → text) → intent parser → /api/fans/:id/cmd → HA → fan
                                                        │
                                       (optional) LLM fallback for fuzzy phrases
```

## Web Speech API basics

```ts
const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new Rec();
recognition.lang = "en-IN";        // or user's preference
recognition.interimResults = false;
recognition.maxAlternatives = 3;   // gives the parser fallbacks
recognition.onresult = (e) => handleTranscript(e.results[0][0].transcript);
recognition.start();
```

Notes for Antigravity:
- **Browser support:** best in Chrome/Edge (desktop + Android). Safari/iOS support is partial — feature-detect and hide the mic button (or show a text-input fallback) when unavailable.
- **HTTPS required** — speech recognition only works on secure origins (Vercel gives this).
- **Permission:** the browser prompts for mic access on first use; handle denial gracefully.
- Push-to-talk (hold or tap-to-start) is more reliable than always-listening and avoids privacy concerns. Start with tap-to-start, listen for one utterance, stop.

## Intent parsing

Turn free text into a structured command. Use a **rule-based parser first** (fast, offline, predictable); add an optional LLM fallback for phrases the rules miss.

### Target shape
```ts
type Intent =
  | { entity: string; action: "power"; value: boolean }
  | { entity: string; action: "speed"; value: number }   // 1..6
  | { entity: string; action: "led";   value: boolean }
  | { entity: string; action: "timer"; value: number }   // preset
  | { type: "unknown"; transcript: string };
```

### Rule-based parser (`lib/intents.ts`)

1. **Resolve the fan.** Match room/aliases against the known entities from `/api/fans`. Maintain an alias map, e.g.:
   ```ts
   const aliases = {
     "fan.living_room": ["living room", "hall", "lounge", "drawing room"],
     "fan.bedroom":     ["bedroom", "room"],
   };
   ```
   If no fan is named but there's only one, default to it. If ambiguous, ask ("which fan?").
2. **Detect the action + value** with keyword rules:
   | Phrase pattern | Intent |
   |----------------|--------|
   | "turn on", "switch on", "start" | `power: true` |
   | "turn off", "switch off", "stop" | `power: false` |
   | "speed <n>", "set to <n>", "level <n>" | `speed: n` (clamp 1–6) |
   | "faster", "increase", "speed up" | `speed: current+1` |
   | "slower", "decrease", "slow down" | `speed: current-1` |
   | "max", "full", "fastest" | `speed: 6` |
   | "light on/off", "led on/off", "lamp" | `led: true/false` |
   | "sleep timer", "timer <n> hours", "turn off in <n>" | `timer` preset |
   Parse spoken numbers too ("three" → 3).
3. Return `Intent`. If nothing matches, return `unknown` and (optionally) hand off to the LLM.

### Optional LLM fallback
For fuzzy natural language ("it's hot in here" → max speed), send the transcript + the list of fans + allowed actions to an LLM and ask it to return the `Intent` JSON. Keep it optional and behind a setting — the rule parser covers the common cases with zero latency/cost. If you add it, call the model **server-side** from an API route so no key is in the browser.

## Feedback to the user
- Show the recognized transcript so the user sees what was heard.
- Confirm the action taken ("Living Room fan → speed 3") via a toast **and** optionally speak it back with `speechSynthesis`.
- On `unknown`, say "Sorry, I didn't catch a fan and an action" and show examples.

## Example utterances to support in v1
- "Turn on the bedroom fan"
- "Living room fan speed four"
- "Make the hall fan faster"
- "Turn everything off" (broadcast to all fans)
- "Set bedroom to max"
- "Turn off the fan in two hours" (timer, if model supports)
- "Turn the light off" (LED models)

## Privacy
- Only capture audio while the button is held/active; stop immediately after one utterance.
- Do the transcription in the browser; only the resulting **text/intent** goes to your server — never raw audio.
- Make the listening state visually obvious.
