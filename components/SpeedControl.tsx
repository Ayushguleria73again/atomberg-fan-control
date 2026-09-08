"use client";

import React, { useRef, useEffect, useState } from "react";

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
  const [selectedSpeed, setSelectedSpeed] = useState(speed);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize internal state when prop updates
  useEffect(() => {
    setSelectedSpeed(speed);
  }, [speed]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSelectSpeed = (targetSpeed: number) => {
    if (!online || !power) return;

    setSelectedSpeed(targetSpeed);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce command execution by 280ms
    debounceTimerRef.current = setTimeout(() => {
      onSpeedChange(targetSpeed);
    }, 280);
  };

  const steps = [1, 2, 3, 4, 5, 6];
  const activeIndex = Math.max(0, Math.min(5, (selectedSpeed || 1) - 1));

  return (
    <div className={`space-y-1.5 transition-opacity duration-200 ${!power || !online ? "opacity-45 pointer-events-none" : ""}`}>
      <div className="flex items-center justify-between text-[13px] font-semibold text-[var(--text-secondary)]">
        <span>Speed</span>
        <span className="text-[var(--text)] font-mono tabular-nums">
          Level {power && online ? selectedSpeed : "Off"} / 6
        </span>
      </div>

      {/* Segmented Speed Track with Animated Sliding Thumb */}
      <div
        className="relative grid grid-cols-6 bg-[var(--surface-2)] rounded-[12px] p-[3px] isolate select-none border border-[var(--border)]"
        role="group"
        aria-label="Speed level"
      >
        {/* Sliding Thumb */}
        <span
          className="absolute top-[3px] bottom-[3px] left-[3px] rounded-[9px] bg-[var(--surface)] shadow-sm transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)] -z-10"
          style={{
            width: "calc((100% - 6px) / 6)",
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />

        {steps.map((level) => {
          const isSelected = selectedSpeed === level;

          return (
            <button
              key={level}
              type="button"
              onClick={() => handleSelectSpeed(level)}
              disabled={!online || !power}
              aria-pressed={isSelected}
              aria-label={`Speed level ${level}`}
              className={`border-0 bg-transparent py-2 rounded-[9px] font-semibold text-[15px] font-mono tabular-nums cursor-pointer transition-colors duration-150 min-h-[44px] flex items-center justify-center ${
                isSelected
                  ? "text-[var(--text)] font-bold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text)]"
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
