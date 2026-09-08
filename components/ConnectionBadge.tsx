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
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground bg-secondary/60 rounded-full border border-border/50">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (isError || !data?.authenticated) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-rose-300 bg-rose-950/40 rounded-full border border-rose-800/50">
        <CloudOff className="w-3.5 h-3.5 text-rose-400" />
        <span>Disconnected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/40 rounded-full border border-emerald-800/50">
      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
      <span>Cloud Ready</span>
    </div>
  );
}
