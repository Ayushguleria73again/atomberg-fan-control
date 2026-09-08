"use client";

import React, { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  ArrowRight,
  Send,
  Loader2,
} from "lucide-react";
import { ParsedIntent } from "@/lib/intents";

interface VoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isListening: boolean;
  isExecuting?: boolean;
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
  isExecuting = false,
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedCommand.trim() && !isExecuting) {
      onTextSubmit(typedCommand.trim());
      setTypedCommand("");
      // Drop mobile keyboard focus
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
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
      {/* Frosted Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Sheet / Dialog */}
      <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[24px] p-6 shadow-2xl space-y-5 z-10 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[17px] font-bold text-[var(--text)] tracking-tight">
              Voice Control
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)] font-medium">
              Control fans with natural speech
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAudioFeedback}
              title={
                isAudioFeedbackEnabled
                  ? "Spoken feedback ON"
                  : "Spoken feedback OFF"
              }
              aria-label="Toggle spoken audio feedback"
              className={`w-[36px] h-[36px] rounded-full flex items-center justify-center transition-colors border ${
                isAudioFeedbackEnabled
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] border-transparent"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text)]"
              }`}
            >
              {isAudioFeedbackEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close voice dialog"
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text)] bg-[var(--surface-2)] border border-[var(--border)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Mic Section */}
        <div className="flex flex-col items-center justify-center py-4 space-y-3">
          <div className="relative flex items-center justify-center">
            {/* Calm pulsing rings */}
            {isListening && (
              <>
                <div className="absolute w-24 h-24 rounded-full bg-[var(--accent-soft)] animate-ping opacity-75" />
                <div className="absolute w-20 h-20 rounded-full bg-[var(--accent-soft)] animate-pulse" />
              </>
            )}

            <button
              type="button"
              disabled={isExecuting}
              onClick={isListening ? onStopListening : onStartListening}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              className={`relative z-10 flex items-center justify-center w-[68px] h-[68px] rounded-full transition-transform duration-200 active:scale-95 border-0 cursor-pointer shadow-md disabled:opacity-50 ${
                isExecuting
                  ? "bg-[var(--accent)] text-white"
                  : isListening
                  ? "bg-[var(--danger)] text-white scale-105"
                  : "bg-[var(--accent)] text-white hover:bg-[var(--accent-press)]"
              }`}
            >
              {isExecuting ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : (
                <Mic className="w-7 h-7" />
              )}
            </button>
          </div>

          <div className="text-center space-y-0.5">
            <p className="text-[14px] font-semibold text-[var(--text)]">
              {isExecuting
                ? "Executing Command…"
                : isListening
                ? "Listening…"
                : "Tap to Speak"}
            </p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              {isExecuting
                ? "Communicating with fan…"
                : isListening
                ? "Speak a command (e.g., 'Balcony fan speed 3')"
                : "Microphone listens for one phrase"}
            </p>
          </div>
        </div>

        {/* Transcript Box */}
        {(transcript || interimTranscript) && (
          <div className="p-3 rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] space-y-0.5">
            <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
              Heard
            </div>
            <p className="text-[14px] font-medium text-[var(--text)]">
              "{transcript || interimTranscript}"
            </p>
          </div>
        )}

        {/* Result Feedback */}
        {parsedResult && !isExecuting && (
          <div className="space-y-2">
            {parsedResult.type === "command" ||
            parsedResult.type === "broadcast" ? (
              <div className="flex items-center gap-2 p-3 rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--success)] text-[13px] font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{parsedResult.spokenDescription}</span>
              </div>
            ) : parsedResult.type === "disambiguate" ? (
              <div className="p-3 rounded-[14px] bg-[var(--amber-soft)] text-[var(--amber)] text-[13px] space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parsedResult.message}</span>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {parsedResult.candidateFans.map((fan) => (
                    <button
                      key={fan}
                      type="button"
                      disabled={isExecuting}
                      onClick={() =>
                        onTextSubmit(
                          `${fan} ${parsedResult.rawTranscript.replace(
                            /hall(\s*fan)?/i,
                            ""
                          )}`
                        )
                      }
                      className="px-3 py-1.5 text-[12px] font-semibold rounded-full bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] shadow-sm cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                    >
                      {fan}
                    </button>
                  ))}
                </div>
              </div>
            ) : parsedResult.type === "unknown" ? (
              <div className="p-3 rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--danger)] text-[13px] space-y-1 animate-in fade-in">
                <div className="flex items-center gap-2 font-semibold">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>Didn't recognize that command</span>
                </div>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  {parsedResult.reason}
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Error message */}
        {errorMessage && !isExecuting && (
          <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[var(--surface-2)] border border-[var(--danger)] text-[var(--danger)] text-[12px]">
            <MicOff className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Text Input Fallback */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <input
            type="text"
            disabled={isExecuting}
            value={typedCommand}
            onChange={(e) => setTypedCommand(e.target.value)}
            placeholder="Or type a command (e.g. Speed 4)..."
            className="flex-1 px-3.5 py-2.5 text-[15px] sm:text-[14px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!typedCommand.trim() || isExecuting}
            aria-label="Submit command"
            className="w-[42px] h-[42px] rounded-[12px] bg-[var(--accent)] text-white flex items-center justify-center border-0 cursor-pointer disabled:opacity-40 transition-opacity"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>

        {/* Example chips */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
          <div className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Examples
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sampleCommands.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={isExecuting}
                onClick={() => onTextSubmit(sample)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11.5px] font-medium rounded-full bg-[var(--surface-2)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors border-0 cursor-pointer disabled:opacity-40"
              >
                <span>{sample}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
