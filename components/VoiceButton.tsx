"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { parseVoiceIntent, ParsedIntent } from "@/lib/intents";
import { NormalizedFanState, FansApiResponse } from "@/lib/types";
import { VoiceModal } from "./VoiceModal";
import { toast } from "sonner";

interface VoiceButtonProps {
  fans: NormalizedFanState[];
}

export function VoiceButton({ fans }: VoiceButtonProps) {
  const queryClient = useQueryClient();
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedIntent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAudioFeedbackEnabled, setIsAudioFeedbackEnabled] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        recognition.maxAlternatives = 3;

        recognition.onstart = () => {
          setIsListening(true);
          setErrorMessage(null);
          setTranscript("");
          setInterimTranscript("");
        };

        recognition.onresult = (event: any) => {
          let currentInterim = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          if (currentInterim) {
            setInterimTranscript(currentInterim);
          }

          if (finalTranscript) {
            setTranscript(finalTranscript);
            handleExecuteVoiceCommand(finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          setIsListening(false);
          if (event.error === "no-speech") {
            setErrorMessage("No speech was detected. Please try speaking again.");
          } else if (event.error === "not-allowed") {
            setErrorMessage("Microphone permission was denied.");
          } else {
            setErrorMessage(`Speech recognition error: ${event.error}`);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [fans]);

  const speakFeedback = (text: string) => {
    if (
      isAudioFeedbackEnabled &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartListening = () => {
    setErrorMessage(null);
    setTranscript("");
    setInterimTranscript("");
    setParsedResult(null);

    if (!recognitionRef.current) {
      setErrorMessage(
        "Web Speech API is not supported in this browser. You can type commands below."
      );
      setIsOpenModal(true);
      return;
    }

    try {
      recognitionRef.current.start();
      setIsOpenModal(true);
    } catch {
      try {
        recognitionRef.current.stop();
        setTimeout(() => recognitionRef.current?.start(), 150);
      } catch {
        // ignore
      }
    }
  };

  const handleStopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  };

  const handleExecuteVoiceCommand = async (text: string) => {
    const intent = parseVoiceIntent(text, fans);
    setParsedResult(intent);

    if (intent.type === "command") {
      const previousData = queryClient.getQueryData<FansApiResponse>(["fans"]);

      if (previousData) {
        queryClient.setQueryData<FansApiResponse>(["fans"], {
          ...previousData,
          fans: previousData.fans.map((f) => {
            if (f.id !== intent.deviceId) return f;
            const updated = { ...f, lastUpdated: Date.now() };
            if (intent.action === "power") updated.power = intent.value;
            if (intent.action === "speed") {
              updated.speed = intent.value;
              updated.power = true;
            }
            if (intent.action === "led") updated.led = intent.value;
            if (intent.action === "sleep") updated.sleep = intent.value;
            if (intent.action === "timer") updated.timerHours = intent.value;
            return updated;
          }),
        });
      }

      try {
        const res = await fetch(`/api/fans/${intent.deviceId}/cmd`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: intent.action,
            value: intent.value,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to control ${intent.fanName}`);
        }

        toast.success(intent.spokenDescription);
        speakFeedback(intent.spokenDescription);

        setTimeout(() => {
          setIsOpenModal(false);
        }, 1800);
      } catch (err: unknown) {
        if (previousData) {
          queryClient.setQueryData(["fans"], previousData);
        }
        const msg =
          err instanceof Error ? err.message : "Voice command execution failed";
        toast.error(msg);
        speakFeedback("Sorry, command failed.");
      }
    } else if (intent.type === "broadcast") {
      const runningFans = fans.filter((f) => f.online);
      const previousData = queryClient.getQueryData<FansApiResponse>(["fans"]);

      if (previousData) {
        queryClient.setQueryData<FansApiResponse>(["fans"], {
          ...previousData,
          fans: previousData.fans.map((f) => ({
            ...f,
            power: intent.value,
            lastUpdated: Date.now(),
          })),
        });
      }

      try {
        const promises = runningFans.map((fan) =>
          fetch(`/api/fans/${fan.id}/cmd`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "power", value: intent.value }),
          })
        );
        await Promise.all(promises);

        toast.success(intent.spokenDescription);
        speakFeedback(intent.spokenDescription);

        setTimeout(() => {
          setIsOpenModal(false);
        }, 1800);
      } catch (err: unknown) {
        if (previousData) {
          queryClient.setQueryData(["fans"], previousData);
        }
        const msg =
          err instanceof Error ? err.message : "Broadcast command failed";
        toast.error(msg);
        speakFeedback("Failed to update all fans.");
      }
    } else if (intent.type === "disambiguate") {
      speakFeedback(intent.message);
    } else {
      speakFeedback("I didn't catch a valid fan command.");
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) Bottom Right */}
      <button
        type="button"
        onClick={handleStartListening}
        aria-label="Voice control"
        className="fixed bottom-[calc(20px+env(safe-area-inset-bottom))] right-5 w-[58px] h-[58px] rounded-full bg-[var(--accent)] text-white border-0 cursor-pointer flex items-center justify-center shadow-[0_8px_22px_var(--accent-soft),0_4px_12px_rgba(0,0,0,0.18)] transition-transform duration-150 active:scale-[0.93] z-30"
      >
        <Mic className="w-6 h-6" />
      </button>

      {/* Voice Modal Overlay */}
      <VoiceModal
        isOpen={isOpenModal}
        onClose={() => {
          handleStopListening();
          setIsOpenModal(false);
        }}
        isListening={isListening}
        transcript={transcript}
        interimTranscript={interimTranscript}
        parsedResult={parsedResult}
        errorMessage={errorMessage}
        onStartListening={handleStartListening}
        onStopListening={handleStopListening}
        onTextSubmit={handleExecuteVoiceCommand}
        isAudioFeedbackEnabled={isAudioFeedbackEnabled}
        onToggleAudioFeedback={() =>
          setIsAudioFeedbackEnabled(!isAudioFeedbackEnabled)
        }
      />
    </>
  );
}
