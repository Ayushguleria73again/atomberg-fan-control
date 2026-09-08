---
name: vad-pipeline
description: How to build the high-end hands-free voice pipeline for the fan app — on-device neural Voice Activity Detection (Silero VAD via @ricky0123/vad-web) for endpointing, an optional wake word (Porcupine/openWakeWord), and accurate speech-to-text (Groq Whisper by default, Deepgram for streaming). Use when implementing hands-free voice, VAD, wake words, or cloud transcription, or when the basic tap-to-talk Web Speech flow needs to become noise-robust and cross-browser. Do not use for the simple Phase-4 tap-to-talk button (that's the voice-intent skill).
---

# High-end VAD voice pipeline

Full design + tuning + sources: `docs/12-voice-vad-architecture.md`. Pipeline:
`mic → Silero VAD (endpoint) → [wake word] → STT → lib/intents.ts → /api/fans/:id/cmd`.

## Stage 1 — Silero VAD (`@ricky0123/vad-web`)
```bash
npm i @ricky0123/vad-web onnxruntime-web
```
- Load lazily in a **client** component (`await import('@ricky0123/vad-web')`) so the model stays out of the initial bundle.
- Secure origin required (HTTPS/localhost). If `SharedArrayBuffer`/threaded-WASM errors appear, set COOP/COEP headers or use single-threaded onnxruntime-web.
- Self-host assets for prod: copy `vad.worklet.bundle.min.js`, the Silero `.onnx`, and ort `.wasm` into `public/`; set `baseAssetPath` + `onnxWASMBasePath`. CDN default is fine for dev.

```ts
const vad = await MicVAD.new({
  model: "v5",
  onSpeechStart: () => ui.listening(true),
  onSpeechEnd: (audio) => { ui.listening(false); transcribe(audio); }, // Float32Array @16kHz mono
  onVADMisfire: () => ui.listening(false),
  positiveSpeechThreshold: 0.7,   // noisy fan room: keep high to avoid false starts
  negativeSpeechThreshold: 0.35,
  redemptionFrames: 12,           // don't cut off mid-sentence
  minSpeechFrames: 9,             // reject clicks/coughs
  preSpeechPadFrames: 3,
});
vad.start();  // vad.pause() to stop; pause during TTS to avoid self-hearing
```
Expose the 5 tuning params in `/settings` — they must be dialed against the real fans.

## Stage 2 — Wake word (optional)
Default: **skip it**; use a "hands-free mode" toggle. If wanted later: Porcupine (free personal tier, easy custom word, best DX) or openWakeWord (open, but pretrained models are non-commercial → train your own). Run the wake word first; only start VAD→STT after it fires.

## Stage 3 — STT (server-side key)
Default **Groq Whisper Large v3 Turbo** (fast, cheap, cross-browser; VAD already endpointed so no streaming needed).
1. Client: encode the `Float32Array` → 16-bit PCM WAV Blob (16kHz mono).
2. `POST /api/voice/transcribe` (multipart) with the audio.
3. Server route: forward to Groq with `GROQ_API_KEY` (server env), model `whisper-large-v3-turbo`; return `{ text }`.
Fallback tier: VAD gates the Web Speech API (free, weaker on iOS). Upgrade path: Deepgram Nova-3/Flux for live partials.

## Stage 4 — Intent + feedback
- Reuse `lib/intents.ts`; two "Hall" fans → disambiguate (see `docs/10`).
- Show transcript; confirm via toast + optional `speechSynthesis`; `unknown` → say what was heard + examples.

## Constraints / Do not
- STT API key is a secret → server-side only, never `NEXT_PUBLIC_`, never in a response.
- Send only the short endpointed command segment to STT — never a continuous stream.
- No polling of the Atomberg API from the voice flow; reuse the existing command route.
- Load VAD/onnx lazily; don't block first paint.
