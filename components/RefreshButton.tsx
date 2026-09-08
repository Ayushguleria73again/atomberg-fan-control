"use client";

import React from "react";
import { RotateCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  isFetching: boolean;
  lastUpdated?: number;
}

export function RefreshButton({
  onRefresh,
  isFetching,
  lastUpdated,
}: RefreshButtonProps) {
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })
    : "just now";

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isFetching}
      aria-label="Refresh fan states"
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:text-[var(--accent-press)] cursor-pointer bg-transparent border-0 p-0 transition-opacity duration-150 disabled:opacity-50"
    >
      <RotateCw
        className={`w-[15px] h-[15px] ${isFetching ? "animate-spin" : ""}`}
      />
      <span>Last updated {formattedTime}</span>
    </button>
  );
}
