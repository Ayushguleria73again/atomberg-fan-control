"use client";

import React from "react";
import { Lightbulb, Loader2 } from "lucide-react";

interface LedToggleProps {
  led: boolean;
  online: boolean;
  isPending: boolean;
  onToggle: (newLed: boolean) => void;
}

export function LedToggle({
  led,
  online,
  isPending,
  onToggle,
}: LedToggleProps) {
  const isOn = led && online;

  return (
    <button
      onClick={() => onToggle(!led)}
      disabled={!online || isPending}
      aria-label={isOn ? "Turn underlight off" : "Turn underlight on"}
      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
        isOn
          ? "bg-gradient-to-b from-amber-500/20 to-amber-950/40 border-amber-400/50 text-amber-200 shadow-md shadow-amber-500/10"
          : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
      }`}
    >
      <div className="flex items-center gap-1 mb-1">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
        ) : (
          <Lightbulb
            className={`w-4 h-4 transition-colors ${
              isOn ? "text-amber-400 fill-amber-400/20" : "text-muted-foreground"
            }`}
          />
        )}
      </div>
      <span className="text-[10px] font-semibold tracking-wide">Underlight</span>
      <span className={`text-[11px] font-bold ${isOn ? "text-amber-300" : "text-muted-foreground"}`}>
        {isOn ? "ON" : "OFF"}
      </span>
    </button>
  );
}
