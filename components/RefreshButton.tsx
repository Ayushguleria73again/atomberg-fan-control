"use client";

import React from "react";
import { RotateCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  isFetching: boolean;
}

export function RefreshButton({ onRefresh, isFetching }: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={isFetching}
      aria-label="Refresh fan status"
      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground transition-all duration-150 border border-border/80 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
    >
      <RotateCw
        className={`w-3.5 h-3.5 text-cyan-400 ${
          isFetching ? "animate-spin" : ""
        }`}
      />
      <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
    </button>
  );
}
