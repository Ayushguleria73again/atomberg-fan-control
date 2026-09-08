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

## Stage 3 — STT: free, on-device Whisper (CHOSEN)
**Transformers.js Whisper — no API key, audio never leaves the device, offline after first download.**
```bash
npm i @huggingface/transformers
```
```ts
import { pipeline } from "@huggingface/transformers";
const transcriber = await pipeline("automatic-speech-recognition",
  "Xenova/whisper-base.en", { device: "webgpu" }); // falls back to wasm
const { text } = await transcriber(audio);           // audio = Float32Array @16kHz from VAD
```
- Load the pipeline ONCE (lazy) + reuse; show a one-time "downloading voice model…" state. No server route, no STT secret.
- Model: `whisper-base.en` default; `whisper-tiny.en` on weak phones; `whisper-small.en` for more accuracy.
- WebGPU is great on Chrome/Edge desktop+Android; **iOS Safari WebGPU is limited** → falls back to WASM (use tiny) or the fallbacks below.
- Fallbacks (only if a device can't run it): VAD-gated Web Speech API (free), or Groq Whisper via a server route with `GROQ_API_KEY` (free tier) — server-side key only.

## Stage 2 — "Hey Fan" wake word (CHOSEN, free)
Do NOT use Porcupine's free custom words — they're personal-only, expire in 30 days, and aren't licensed for Web. Free paths:
- **Software wake word (default):** always-on VAD → transcribe each segment on-device (free) → if transcript starts with "hey fan"/"ok fan"/"fan", strip the prefix and treat the rest as the command; else ignore. Pause the loop while acting/speaking (barge-in).
- **openWakeWord (low-power alt):** ship a small "hey fan" ONNX model, run via onnxruntime-web, gate VAD→STT on it. Pretrained models are CC-BY-NC-SA (non-commercial = fine for this personal app).

## Stage 4 — Intent + feedback
- Reuse `lib/intents.ts`; two "Hall" fans → disambiguate (see `docs/10`).
- Show transcript; confirm via toast + optional `speechSynthesis`; `unknown` → say what was heard + examples.

## Constraints / Do not
- STT API key is a secret → server-side only, never `NEXT_PUBLIC_`, never in a response.
- Send only the short endpointed command segment to STT — never a continuous stream.
- No polling of the Atomberg API from the voice flow; reuse the existing command route.
- Load VAD/onnx lazily; don't block first paint.
