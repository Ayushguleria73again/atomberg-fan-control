"use client";

import React, { useState } from "react";
import { Timer } from "lucide-react";

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
    { label: "1 hour", value: 1 },
    { label: "2 hours", value: 2 },
    { label: "3 hours", value: 3 },
    { label: "4 hours", value: 4 },
    { label: "6 hours", value: 6 },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={!online || isPending}
        aria-label={`Timer settings: currently ${isActive ? `${timerHours}h` : "off"}`}
        className={`w-full border rounded-[12px] p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 active:scale-[0.97] min-h-[58px] disabled:opacity-40 disabled:pointer-events-none ${
          isActive
            ? "bg-[var(--accent-soft)] border-transparent text-[var(--accent)]"
            : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
        }`}
      >
        <Timer className="w-[19px] h-[19px] stroke-[1.8]" />
        <span className="text-[12px] font-semibold leading-none">Timer</span>
        <span
          className={`text-[11px] font-medium leading-none ${
            isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
          }`}
        >
          {isActive ? `${timerHours}h` : "Off"}
        </span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full mb-2 right-0 left-0 sm:left-auto sm:w-44 z-40 bg-[var(--surface)] border border-[var(--border)] rounded-[16px] shadow-lg p-1.5 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="text-[11px] font-semibold px-2.5 py-1 text-[var(--text-tertiary)] uppercase tracking-wider">
              Set Timer
            </div>
            {presets.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  onSelectTimer(preset.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-[13px] font-semibold rounded-[10px] transition-colors flex items-center justify-between cursor-pointer border-0 ${
                  timerHours === preset.value
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-transparent text-[var(--text)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span>{preset.label}</span>
                {timerHours === preset.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
