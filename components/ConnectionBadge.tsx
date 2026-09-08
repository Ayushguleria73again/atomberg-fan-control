"use client";

import React from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function ConnectionBadge() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Health check failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
        <span>Checking…</span>
      </div>
    );
  }

  if (isError || data?.status !== "ok") {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-[var(--danger)] bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
        <CloudOff className="w-3.5 h-3.5 text-[var(--danger)]" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-[var(--success)] bg-[var(--surface-2)] rounded-full border border-[var(--border)]">
      <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
      <Cloud className="w-3.5 h-3.5 text-[var(--success)]" />
      <span>Cloud Ready</span>
    </div>
  );
}
