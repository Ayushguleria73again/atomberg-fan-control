# 12 — High-End Voice / VAD Architecture

Upgrades voice from "tap-to-talk + browser recognizer" (Phase 4) to a **hands-free, noise-robust pipeline**: neural Voice Activity Detection for endpointing, an optional wake word, and accurate speech-to-text. This is the design doc; the build lives in the `vad-pipeline` skill and roadmap Phase 6.

## Why not just the Web Speech API?

The browser's `SpeechRecognition` is free but: it does its own mic capture (you can't feed it clean VAD-segmented audio), it's weak/absent on iOS Safari, accuracy drops with background noise — and **your environment is literally full of fan + ambient noise**. A "high-end" setup separates the concerns:

```
   mic ─► [1] VAD (endpointing) ─► [2] wake word (gate) ─► [3] STT (transcribe) ─► [4] intent ─► /api/fans/:id/cmd
          Silero v5, on-device     optional, on-device     cloud Whisper/Deepgram    rule-based
```

Each stage is independent and swappable.

## Stage 1 — VAD (the core): Silero VAD via `@ricky0123/vad-web`

Silero VAD is an enterprise-grade neural VAD trained on 6000+ languages, robust to noise — the right pick for a fan-filled room. In the browser it runs fully **on-device** (ONNX Runtime Web + WASM) through `@ricky0123/vad-web`, which handles mic capture, the AudioWorklet, and speech segmentation.

### Install & assets
```bash
npm i @ricky0123/vad-web onnxruntime-web
```
It needs three asset groups at runtime: the `vad.worklet.bundle.min.js`, the Silero `.onnx` model, and the onnxruntime `.wasm` files.
- **Simplest:** let it load these from CDN (default). Works out of the box.
- **Self-hosted (recommended for prod):** copy those files into `public/` during build and set `baseAssetPath` (worklet + model) and `onnxWASMBasePath` (wasm). Avoids a third-party CDN dependency and CSP headaches.

### Core usage
```ts
import { MicVAD } from "@ricky0123/vad-web";

const vad = await MicVAD.new({
  model: "v5",                       // latest Silero
  onSpeechStart: () => setListening(true),
  onSpeechEnd: (audio /* Float32Array @ 16kHz mono */) => {
    setListening(false);
    transcribe(audio);               // → Stage 3
  },
  onVADMisfire: () => setListening(false),  // too-short blip, ignored

  // tuning (see below)
  positiveSpeechThreshold: 0.7,
  negativeSpeechThreshold: 0.35,
  redemptionFrames: 12,
  minSpeechFrames: 9,
  preSpeechPadFrames: 3,
});
vad.start();   // hands-free; vad.pause() to stop
```

`onSpeechEnd` hands you a **Float32Array of 16 kHz mono PCM** — exactly one utterance, already endpointed.

### Tuning for a noisy fan room (important)
Ceiling-fan whir + TV will cause false triggers on a naive VAD. Tune:
| Param | Meaning | Suggested start | Effect |
|-------|---------|-----------------|--------|
| `positiveSpeechThreshold` | confidence to call it speech | **0.6–0.8** | ↑ = fewer fan-noise false starts |
| `negativeSpeechThreshold` | confidence to call it silence | **0.3–0.4** | controls end sensitivity |
| `redemptionFrames` | silence frames before ending | **8–24** | ↑ = don't cut off mid-sentence |
| `minSpeechFrames` | min length to count | **8–10** | ↑ = reject clicks/coughs/blips |
| `preSpeechPadFrames` | audio kept before onset | **1–5** | avoids clipping the first word |

Expose these in `/settings` so you can dial them in against your actual fans. Start conservative (higher positive threshold) and relax until it feels responsive.

### Gotchas
- **Secure origin required** (mic): HTTPS or `localhost`. Works on Vercel; not on a plain `http://LAN-IP`.
- onnxruntime-web threaded WASM can want cross-origin isolation (COOP/COEP headers). If you hit `SharedArrayBuffer` errors, either set those headers in `next.config` / middleware or use the single-threaded WASM build. Single-threaded is fine for one VAD stream.
- Call `MicVAD.new()` lazily (dynamic `import()` in a client component) so the model isn't in the initial bundle.

## Stage 2 — Wake word (optional gate)

Without a gate, always-on VAD transcribes **every** utterance you say near the app (cost + privacy). A wake word ("Hey Fan") makes it only act after the phrase.

| Option | On-device | License | Notes |
|--------|-----------|---------|-------|
| **Picovoice Porcupine** | ✅ | Free personal tier; paid commercial | Mature Web SDK, custom words in seconds, 97%+ accuracy. Best DX. |
| **openWakeWord** | ✅ | Pretrained models **CC-BY-NC-SA (non-commercial)** | Free & open, but ship a **custom-trained** model for anything public. Needs ML effort. |
| **No wake word** | — | — | For a private personal app, skip it: VAD + a "start listening" toggle is enough. |

**Recommendation:** for a personal home app, **skip the wake word initially** (toggle hands-free mode on when you want it). Add Porcupine later if you want true "Hey Fan" always-on. If you do add it, run Porcupine first and only start the VAD→STT flow after the wake word fires.

## Stage 3 — Speech-to-text

You have the endpointed 16 kHz audio; now transcribe it.

| Route | Accuracy | Latency | Cost | Cross-browser | Verdict |
|-------|----------|---------|------|---------------|---------|
| **Web Speech API** (gated by VAD) | ok | instant | free | weak on iOS | Fallback / offline tier |
| **Groq — Whisper Large v3 Turbo** | high | ~200ms/segment | ~$0.04/hr | ✅ (server-side) | **Recommended default** |
| **Deepgram Nova-3 / Flux** | high | sub-300ms streaming | higher | ✅ | If you later want live partials |

**Why Groq is the default here:** fan commands are short, discrete utterances and the **VAD already did the endpointing**, so you don't need streaming partials. Groq buffers a full segment (perfect for our case), returns in ~200ms, is ~9× cheaper than OpenAI, and works on every browser because the call is server-side. Deepgram's streaming edge matters for continuous dictation, not one-shot commands — keep it as an upgrade path.

### Flow (keep the key server-side)
1. Client: encode the `Float32Array` → 16-bit PCM **WAV** (or WebM/Opus) Blob.
2. Client: `POST /api/voice/transcribe` (multipart) with the audio.
3. Server route: forward to Groq's transcription endpoint with `GROQ_API_KEY` (server env), model `whisper-large-v3-turbo`; return `{ text }`.
4. Client: pass `text` to Stage 4.

> The STT API key is a secret → server-side only, never `NEXT_PUBLIC_`. See [07-security.md](07-security.md).

## Stage 4 — Intent + feedback

- Reuse `lib/intents.ts` (the rule-based parser) → `{ deviceId, action, value }`; optional server-side LLM fallback for fuzzy phrases.
- Remember the **two "Hall" fans** — disambiguate as in [docs/10](10-your-devices.md).
- Feedback: show the transcript, confirm with a toast + optional `speechSynthesis`; on `unknown`, say what was heard + examples.
- **Barge-in:** pause the VAD while TTS is speaking so it doesn't hear itself.

## Latency budget (target < 1s after you stop talking)
`redemptionFrames` silence (~0.2–0.5s) → encode (~10ms) → network + Groq (~200–400ms) → intent (instant) → command dispatch. Comfortable sub-second.

## Privacy
- VAD + wake word run **on-device** — no audio leaves the browser until a command segment is sent for transcription.
- With a wake word, only post-wake audio is ever transmitted.
- Send only the short command segment to STT, never a continuous stream. Make the listening state visually obvious.

## Decisions to confirm before building
1. **Hands-free always-on vs toggle?** (Recommended: a "hands-free mode" toggle for v1; no wake word yet.)
2. **STT: Groq cloud (recommended) vs free Web Speech fallback?** Groq needs a `GROQ_API_KEY` and sends command audio to Groq.
3. **Wake word now or later?** (Recommended: later.)

## Sources
- [Silero VAD (snakers4/silero-vad)](https://github.com/snakers4/silero-vad) · [@ricky0123/vad-web docs](https://docs.vad.ricky0123.com/user-guide/browser/) · [npm @ricky0123/vad-web](https://www.npmjs.com/package/@ricky0123/vad-web)
- [Best VAD 2026: Cobra vs Silero vs WebRTC (Picovoice)](https://picovoice.ai/blog/best-voice-activity-detection-vad/)
- [Porcupine wake word](https://picovoice.ai/platform/porcupine/) · [openWakeWord](https://github.com/dscripka/openWakeWord)
- [Groq vs OpenAI Whisper benchmarks 2026](https://dev.to/howmindswork/groq-vs-openai-whisper-real-benchmarks-for-voice-transcription-2026-46lk) · [Whisper vs Deepgram 2026](https://diyai.io/ai-tools/speech-to-text/whisper-vs-deepgram/)
