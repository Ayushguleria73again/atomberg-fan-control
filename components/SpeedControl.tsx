"use client";

import React, { useRef, useEffect } from "react";
import { Gauge } from "lucide-react";

interface SpeedControlProps {
  speed: number;
  power: boolean;
  online: boolean;
  onSpeedChange: (speed: number) => void;
}

export function SpeedControl({
  speed,
  power,
  online,
  onSpeedChange,
}: SpeedControlProps) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSelectSpeed = (targetSpeed: number) => {
    if (!online) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce actual command dispatch by 300ms to coalesce rapid taps/drags
    debounceTimerRef.current = setTimeout(() => {
      onSpeedChange(targetSpeed);
    }, 300);
  };

  const steps = [1, 2, 3, 4, 5, 6];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <Gauge className="w-3.5 h-3.5" />
          <span>Speed</span>
        </div>
        <span className="font-mono text-foreground">
          Level {power && online ? speed : "Off"} / 6
        </span>
      </div>

      {/* Segmented Speed Selector Buttons */}
      <div className="grid grid-cols-6 gap-1.5 p-1 bg-secondary/50 rounded-xl border border-border/50">
        {steps.map((level) => {
          const isSelected = power && online && speed === level;
          const isBelow = power && online && speed >= level;

          return (
            <button
              key={level}
              onClick={() => handleSelectSpeed(level)}
              disabled={!online}
              aria-label={`Set speed to ${level}`}
              className={`relative py-2 rounded-lg font-black text-xs transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none active:scale-95 ${
                isSelected
                  ? "bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 shadow-md shadow-cyan-500/30 scale-[1.02] ring-1 ring-cyan-300"
                  : isBelow
                  ? "bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/50"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {level}
            </button>
          );
        })}
      </div>
    </div>
  );
}
