"use client";

import React from "react";
import { Moon, Loader2 } from "lucide-react";

interface SleepToggleProps {
  sleep: boolean;
  power: boolean;
  online: boolean;
  isPending: boolean;
  onToggle: (newSleep: boolean) => void;
}

export function SleepToggle({
  sleep,
  power,
  online,
  isPending,
  onToggle,
}: SleepToggleProps) {
  const isActive = sleep && power && online;

  return (
    <button
      onClick={() => onToggle(!sleep)}
      disabled={!online || isPending}
      aria-label={isActive ? "Disable sleep mode" : "Enable sleep mode"}
      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
        isActive
          ? "bg-gradient-to-b from-indigo-500/20 to-indigo-950/40 border-indigo-400/50 text-indigo-200 shadow-md shadow-indigo-500/10"
          : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
      }`}
    >
      <div className="flex items-center gap-1 mb-1">
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        ) : (
          <Moon
            className={`w-4 h-4 transition-colors ${
              isActive ? "text-indigo-400 fill-indigo-400/20" : "text-muted-foreground"
            }`}
          />
        )}
      </div>
      <span className="text-[10px] font-semibold tracking-wide">Sleep Mode</span>
      <span className={`text-[11px] font-bold ${isActive ? "text-indigo-300" : "text-muted-foreground"}`}>
        {isActive ? "ACTIVE" : "OFF"}
      </span>
    </button>
  );
}
