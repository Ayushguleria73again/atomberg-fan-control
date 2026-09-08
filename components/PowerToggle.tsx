"use client";

import React from "react";

interface PowerToggleProps {
  power: boolean;
  online: boolean;
  isPending: boolean;
  onToggle: (newPower: boolean) => void;
  fanName?: string;
}

export function PowerToggle({
  power,
  online,
  isPending,
  onToggle,
  fanName = "Fan",
}: PowerToggleProps) {
  const isChecked = power && online;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={`Power ${fanName}`}
      disabled={!online || isPending}
      onClick={() => onToggle(!power)}
      className={`relative w-[51px] h-[31px] rounded-full border-0 p-0 cursor-pointer shrink-0 transition-colors duration-250 disabled:opacity-40 disabled:pointer-events-none ${
        isChecked ? "bg-[var(--success)]" : "bg-[var(--track-off)]"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-[var(--knob)] shadow-[0_2px_5px_rgba(0,0,0,0.28)] transition-transform duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isChecked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}
