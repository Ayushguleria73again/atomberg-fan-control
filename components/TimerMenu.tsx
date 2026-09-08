"use client";

import React, { useState } from "react";
import { Timer, Loader2, ChevronDown } from "lucide-react";

interface TimerMenuProps {
  timerHours: number;
  online: boolean;
  isPending: boolean;
  onSelectTimer: (hours: number) => void;
}

export function TimerMenu({
  timerHours,
  online,
  isPending,
  onSelectTimer,
}: TimerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isActive = timerHours > 0 && online;
  const presets = [
    { label: "Off", value: 0 },
    { label: "1 Hour", value: 1 },
    { label: "2 Hours", value: 2 },
    { label: "3 Hours", value: 3 },
    { label: "4 Hours", value: 4 },
    { label: "6 Hours", value: 6 },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={!online || isPending}
        aria-label="Fan timer settings"
        className={`w-full flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
          isActive
            ? "bg-gradient-to-b from-purple-500/20 to-purple-950/40 border-purple-400/50 text-purple-200 shadow-md shadow-purple-500/10"
            : "bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/70"
        }`}
      >
        <div className="flex items-center gap-1 mb-1">
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
          ) : (
            <Timer
              className={`w-4 h-4 transition-colors ${
                isActive ? "text-purple-400 fill-purple-400/20" : "text-muted-foreground"
              }`}
            />
          )}
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </div>
        <span className="text-[10px] font-semibold tracking-wide">Timer</span>
        <span className={`text-[11px] font-bold ${isActive ? "text-purple-300" : "text-muted-foreground"}`}>
          {isActive ? `${timerHours}h` : "NONE"}
        </span>
      </button>

      {/* Preset Dropdown Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 left-0 right-0 sm:w-36 z-30 bg-card border border-border rounded-xl shadow-xl shadow-black/50 p-1.5 space-y-1 backdrop-blur-md">
            <div className="text-[10px] font-semibold px-2 py-1 text-muted-foreground uppercase tracking-wider">
              Off Timer
            </div>
            {presets.map((preset) => (
              <button
                key={preset.value}
                onClick={() => {
                  onSelectTimer(preset.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-between ${
                  timerHours === preset.value
                    ? "bg-purple-950/60 text-purple-200"
                    : "text-foreground hover:bg-secondary"
                }`}
              >
                <span>{preset.label}</span>
                {timerHours === preset.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
