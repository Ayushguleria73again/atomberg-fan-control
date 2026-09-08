"use client";

import React from "react";
import { Lightbulb } from "lucide-react";

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
  return (
    <button
      type="button"
      onClick={() => onToggle(!led)}
      disabled={!online || isPending}
      aria-label={`Toggle underlight: currently ${led ? "on" : "off"}`}
      className={`border rounded-[12px] p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-200 active:scale-[0.97] min-h-[58px] disabled:opacity-40 disabled:pointer-events-none ${
        led
          ? "bg-[var(--amber-soft)] border-transparent text-[var(--amber)]"
          : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"
      }`}
    >
      <Lightbulb className="w-[19px] h-[19px] stroke-[1.8]" />
      <span className="text-[12px] font-semibold leading-none">Light</span>
      <span
        className={`text-[11px] font-medium leading-none ${
          led ? "text-[var(--amber)]" : "text-[var(--text-tertiary)]"
        }`}
      >
        {led ? "On" : "Off"}
      </span>
    </button>
  );
}
