"use client";

import React from "react";
import { Power, Loader2 } from "lucide-react";

interface PowerToggleProps {
  power: boolean;
  online: boolean;
  isPending: boolean;
  onToggle: (newPower: boolean) => void;
}

export function PowerToggle({
  power,
  online,
  isPending,
  onToggle,
}: PowerToggleProps) {
  const isRunning = power && online;

  return (
    <button
      onClick={() => onToggle(!power)}
      disabled={!online || isPending}
      aria-label={isRunning ? "Turn fan off" : "Turn fan on"}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs tracking-wide transition-all duration-200 border active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
        isRunning
          ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/25 hover:brightness-110"
          : "bg-secondary/80 text-muted-foreground hover:text-foreground hover:bg-secondary border-border/80"
      }`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <Power className={`w-4 h-4 ${isRunning ? "text-slate-950" : "text-muted-foreground"}`} />
      )}
      <span>{isRunning ? "Running" : "Turn On"}</span>
    </button>
  );
}
