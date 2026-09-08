"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Send,
} from "lucide-react";
import { ParsedIntent } from "@/lib/intents";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  parsedResult: ParsedIntent | null;
  errorMessage: string | null;
  onStartListening: () => void;
  onStopListening: () => void;
  onTextSubmit: (text: string) => void;
  isAudioFeedbackEnabled: boolean;
  onToggleAudioFeedback: () => void;
}

export function VoiceModal({
  isOpen,
  onClose,
  isListening,
  transcript,
  interimTranscript,
  parsedResult,
  errorMessage,
  onStartListening,
  onStopListening,
  onTextSubmit,
  isAudioFeedbackEnabled,
  onToggleAudioFeedback,
}: VoiceModalProps) {
  const [typedCommand, setTypedCommand] = useState("");

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedCommand.trim()) {
      onTextSubmit(typedCommand.trim());
      setTypedCommand("");
    }
  };

  const sampleCommands = [
    "Turn on bedroom fan",
    "Hall one fan speed 4",
    "Balcony fan underlight on",
    "Hall two sleep mode on",
    "Turn off balcony in 2 hours",
    "Turn everything off",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Dialog Card */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl shadow-black/80 space-y-5 z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              Voice Control
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleAudioFeedback}
              title={
                isAudioFeedbackEnabled
                  ? "Spoken feedback ON"
                  : "Spoken feedback OFF"
              }
              aria-label="Toggle spoken audio feedback"
              className={`p-2 rounded-lg text-xs transition-colors border ${
                isAudioFeedbackEnabled
                  ? "bg-cyan-950/60 text-cyan-300 border-cyan-800/50"
                  : "bg-secondary/40 text-muted-foreground border-border/40 hover:text-foreground"
              }`}
            >
              {isAudioFeedbackEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              aria-label="Close voice dialog"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Mic / Ripple Section */}
        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="relative flex items-center justify-center">
            {/* Pulsing rings when listening */}
            {isListening && (
              <>
                <div className="absolute w-28 h-28 rounded-full bg-cyan-500/20 animate-ping opacity-75" />
                <div className="absolute w-24 h-24 rounded-full bg-cyan-500/30 animate-pulse" />
              </>
            )}

            <button
              onClick={isListening ? onStopListening : onStartListening}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              className={`relative z-10 flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-xl active:scale-95 ${
                isListening
                  ? "bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-rose-500/40 scale-110"
                  : "bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 shadow-cyan-500/30 hover:scale-105"
              }`}
            >
              {isListening ? (
                <Mic className="w-8 h-8 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-foreground">
              {isListening ? "Listening... Speak your command" : "Tap to Speak"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isListening
                ? "Say a fan and an action (e.g. 'Bedroom fan speed 4')"
                : "Tap the microphone and speak naturally"}
            </p>
          </div>
        </div>

        {/* Transcript / Interim Speech Display */}
        {(transcript || interimTranscript) && (
          <div className="p-3.5 rounded-2xl bg-secondary/60 border border-border/80 space-y-1">
            <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Heard:
            </div>
            <p className="text-sm font-semibold text-foreground italic">
              "{transcript || interimTranscript}"
            </p>
          </div>
        )}

        {/* Result Status / Feedback */}
        {parsedResult && (
          <div className="space-y-2">
            {parsedResult.type === "command" ||
            parsedResult.type === "broadcast" ? (
              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs font-semibold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{parsedResult.spokenDescription}</span>
              </div>
            ) : parsedResult.type === "disambiguate" ? (
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{parsedResult.message}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  {parsedResult.candidateFans.map((fan) => (
                    <button
                      key={fan}
                      onClick={() =>
                        onTextSubmit(
                          `${fan} ${parsedResult.rawTranscript.replace(
                            /hall(\s*fan)?/i,
                            ""
                          )}`
                        )
                      }
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 border border-amber-700/50"
                    >
                      {fan}
                    </button>
                  ))}
                </div>
              </div>
            ) : parsedResult.type === "unknown" ? (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-200 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Didn't catch that command</span>
                </div>
                <p className="text-[11px] text-rose-300/80">
                  {parsedResult.reason}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/20 border border-destructive/40 text-rose-300 text-xs">
            <MicOff className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Text Input Fallback */}
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={typedCommand}
              onChange={(e) => setTypedCommand(e.target.value)}
              placeholder="Or type a command (e.g. Balcony speed 3)..."
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-secondary/50 border border-border/80 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-cyan-400"
            />
            <button
              type="submit"
              disabled={!typedCommand.trim()}
              aria-label="Send typed command"
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold transition-colors disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Sample Suggestions */}
        <div className="space-y-1.5 pt-2 border-t border-border/50">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Example Spoken Commands:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleCommands.map((sample) => (
              <button
                key={sample}
                onClick={() => onTextSubmit(sample)}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg bg-secondary/40 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/40"
              >
                <span>{sample}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
