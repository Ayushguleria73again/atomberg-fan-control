"use client";

import React from "react";
import { Moon } from "lucide-react";

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
  const isEnabled = power && online;

  return (
    <button
      type="button"
      onClick={() => onToggle(!sleep)}
      disabled={!isEnabled || isPending}
      aria-label={`Toggle sleep mode: currently ${sleep ? "on" : "off"}`}
      className={`border rounded-[12px] p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 active:scale-[0.97] min-h-[58px] disabled:opacity-40 disabled:pointer-events-none ${
        sleep
          ? "bg-[var(--accent-soft)] border-transparent text-[var(--accent)]"
          : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
      }`}
    >
      <Moon className="w-[19px] h-[19px] stroke-[1.8]" />
      <span className="text-[12px] font-semibold leading-none">Sleep</span>
      <span
        className={`text-[11px] font-medium leading-none ${
          sleep ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
        }`}
      >
        {sleep ? "On" : "Off"}
      </span>
    </button>
  );
}
