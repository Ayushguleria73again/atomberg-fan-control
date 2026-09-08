# 12 — High-End Voice / VAD Architecture

Upgrades voice from "tap-to-talk + browser recognizer" (Phase 4) to a **hands-free, noise-robust pipeline**: neural Voice Activity Detection for endpointing, an optional wake word, and accurate speech-to-text. This is the design doc; the build lives in the `vad-pipeline` skill and roadmap Phase 6.

## Why not just the Web Speech API?

The browser's `SpeechRecognition` is free but: it does its own mic capture (you can't feed it clean VAD-segmented audio), it's weak/absent on iOS Safari, accuracy drops with background noise — and **your environment is literally full of fan + ambient noise**. A "high-end" setup separates the concerns:

```
   mic ─► [1] VAD (endpointing) ─► [2] "Hey Fan" wake word ─► [3] STT (transcribe) ─► [4] intent ─► /api/fans/:id/cmd
          Silero v5, on-device     software, on-device       Whisper on-device       rule-based
                                                              (Transformers.js/WebGPU)
```

Each stage is independent and swappable. **Chosen stack: fully on-device and free — no audio leaves the browser.**

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

## Stage 3 — Speech-to-text: **free, on-device AI (chosen)**

> **Decision (locked in):** free AI transcription. The chosen engine is **Whisper running on-device via Transformers.js** (Hugging Face `@huggingface/transformers`) — no API key, **audio never leaves the device**, works offline after the first model download, WebGPU-accelerated. Fully free and fully private, and it pairs perfectly with the on-device VAD.

| Route | Cost | Privacy | Accuracy | Notes |
|-------|------|---------|----------|-------|
| **Transformers.js Whisper (WebGPU)** ⭐ | **Free** | **On-device** | high (whisper-base/small) | ~75MB model download once, then offline. WebGPU = 5–10× faster than WASM. **Our default.** |
| Web Speech API (VAD-gated) | free | cloud (browser vendor) | ok | Instant, tiny; weak/absent on iOS. Ultimate fallback. |
| Groq Whisper Large v3 Turbo | free tier* / cheap | cloud | highest | *Groq's API has a free tier with rate limits. Use if a device is too weak for on-device Whisper. Server-side key. |

### On-device Whisper — how
```bash
npm i @huggingface/transformers
```
```ts
import { pipeline } from "@huggingface/transformers";
// load once (lazy), cache the pipeline; prefer WebGPU, fall back to wasm
const transcriber = await pipeline(
  "automatic-speech-recognition",
  "Xenova/whisper-base.en",           // English-only, good speed/accuracy; whisper-tiny.en for weak devices
  { device: "webgpu" }                 // falls back to "wasm" automatically where unsupported
);
// audio = the Float32Array @16kHz from VAD onSpeechEnd
const { text } = await transcriber(audio);
```
- **Model choice:** `whisper-base.en` is a good default; `whisper-tiny.en` for low-power phones; `whisper-small.en` if you want more accuracy and the device can handle it.
- **Load once** and reuse the pipeline; show a one-time "downloading voice model…" state on first use.
- No server route needed — it's all client-side. (That means no STT secret to manage.)

### Browser reality check (be honest)
- **WebGPU** is solid on Chrome/Edge (desktop + Android) in 2026. **iOS Safari WebGPU is still limited** — there it falls back to WASM (slower, use `whisper-tiny.en`) or you use the Web Speech / Groq fallback. Detect and degrade gracefully.
- First load pays the model download; subsequent loads are cached (offline-capable).

## Stage 2 — Wake word: **"Hey Fan" (chosen)**

> **Decision (locked in):** include the "Hey Fan" wake word. Note: **Porcupine's *free* custom wake words are personal-use only, expire after 30 days, and are not licensed for the Web platform** — so they're not a real free option here. Two free paths instead:

| Approach | How | Trade-off |
|----------|-----|-----------|
| **Software wake word** ⭐ (recommended, given free on-device STT) | Always-on VAD → transcribe every segment **on-device** (free) → if the transcript starts with "hey fan"/"ok fan"/"fan", treat the rest as a command; otherwise ignore. | Constantly runs Whisper locally (some CPU/GPU). Zero setup, no training, fully private. Great on a laptop/desktop; on a phone, throttle or use openWakeWord. |
| **openWakeWord** | Train/ship a small "hey fan" ONNX model; run it in-browser via onnxruntime-web; only start VAD→STT after it fires. | Pretrained models are CC-BY-NC-SA (**non-commercial = fine for personal**). Lower power than always transcribing; needs a little ML setup. |

**Recommendation:** start with the **software wake word** — since on-device Whisper is free, "wake word" is just a prefix match on the transcript. If always-transcribing is too heavy on your phone, drop in openWakeWord as the low-power gate later. Either way: after the wake phrase, strip it and pass the remainder to Stage 4; pause the wake loop while acting/speaking (barge-in).

## Stage 4 — Intent + feedback

- Reuse `lib/intents.ts` (the rule-based parser) → `{ deviceId, action, value }`; optional server-side LLM fallback for fuzzy phrases.
- Remember the **two "Hall" fans** — disambiguate as in [docs/10](10-your-devices.md).
- Feedback: show the transcript, confirm with a toast + optional `speechSynthesis`; on `unknown`, say what was heard + examples.
- **Barge-in:** pause the VAD while TTS is speaking so it doesn't hear itself.

## Latency budget (target ~1s after you stop talking)
`redemptionFrames` silence (~0.2–0.5s) → on-device Whisper inference (WebGPU: ~0.2–0.6s for a short command; WASM slower) → intent (instant) → command dispatch. Sub-second on a WebGPU-capable device; a bit more on WASM/phone — use `whisper-tiny.en` there.

## Privacy — fully local by default
With the chosen stack (on-device VAD + on-device Whisper), **no audio ever leaves the device.** The wake word, endpointing, and transcription all run in the browser. Only the final *fan command* (text/JSON) goes to the server. This is the strongest privacy posture and it's also the free one. (The optional Groq fallback is the only path that would send audio off-device — use it only where WebGPU can't cope.)

## Decisions — LOCKED IN
1. **Transcription:** ✅ **free, on-device AI** — Transformers.js Whisper (WebGPU, `whisper-base.en`; `tiny.en` on weak devices). Groq free tier only as a fallback for devices that can't run it.
2. **Activation:** ✅ **"Hey Fan" wake word** — software wake word (prefix-match on the on-device transcript) to start; openWakeWord as a low-power alternative later.
3. **Timing:** ✅ **after deploy** — build as Phase 6, once Phase 5 gives us HTTPS on Vercel.

## Sources
- [Silero VAD (snakers4/silero-vad)](https://github.com/snakers4/silero-vad) · [@ricky0123/vad-web docs](https://docs.vad.ricky0123.com/user-guide/browser/) · [npm @ricky0123/vad-web](https://www.npmjs.com/package/@ricky0123/vad-web)
- [Best VAD 2026: Cobra vs Silero vs WebRTC (Picovoice)](https://picovoice.ai/blog/best-voice-activity-detection-vad/)
- [Porcupine wake word](https://picovoice.ai/platform/porcupine/) · [openWakeWord](https://github.com/dscripka/openWakeWord)
- [Groq vs OpenAI Whisper benchmarks 2026](https://dev.to/howmindswork/groq-vs-openai-whisper-real-benchmarks-for-voice-transcription-2026-46lk) · [Whisper vs Deepgram 2026](https://diyai.io/ai-tools/speech-to-text/whisper-vs-deepgram/)
