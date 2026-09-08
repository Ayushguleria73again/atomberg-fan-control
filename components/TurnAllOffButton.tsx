"use client";

import React, { useState } from "react";
import { PowerOff, Loader2, AlertTriangle, Check } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { NormalizedFanState, FansApiResponse } from "@/lib/types";
import { toast } from "sonner";

interface TurnAllOffButtonProps {
  fans: NormalizedFanState[];
}

export function TurnAllOffButton({ fans }: TurnAllOffButtonProps) {
  const queryClient = useQueryClient();
  const [isOpenConfirm, setIsOpenConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const runningFans = fans.filter((f) => f.power && f.online);
  const activeCount = runningFans.length;

  const handleTurnAllOff = async () => {
    if (activeCount === 0) return;
    setIsProcessing(true);
    setIsOpenConfirm(false);

    // 1. Snapshot previous state for rollback
    const previousData = queryClient.getQueryData<FansApiResponse>(["fans"]);

    // 2. Optimistic update: set all fans to power: false
    if (previousData) {
      queryClient.setQueryData<FansApiResponse>(["fans"], {
        ...previousData,
        fans: previousData.fans.map((fan) => ({
          ...fan,
          power: false,
          lastUpdated: Date.now(),
        })),
      });
    }

    try {
      // 3. Iterate known running fans concurrently (bounded to our 4 fans)
      const commands = runningFans.map((fan) =>
        fetch(`/api/fans/${fan.id}/cmd`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "power", value: false }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed to turn off ${fan.name}`);
          }
          return res.json();
        })
      );

      await Promise.all(commands);
      toast.success(
        activeCount === 1
          ? "Turned off 1 active fan."
          : `Turned off all ${activeCount} active fans.`
      );
    } catch (err: unknown) {
      // Roll back
      if (previousData) {
        queryClient.setQueryData(["fans"], previousData);
      }
      const msg =
        err instanceof Error ? err.message : "Failed to turn off all fans";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpenConfirm(true)}
        disabled={activeCount === 0 || isProcessing}
        aria-label="Turn off all fans"
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
          activeCount > 0
            ? "bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/50 shadow-sm shadow-rose-950/30"
            : "bg-secondary/40 text-muted-foreground border-border/40"
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
        ) : (
          <PowerOff className="w-3.5 h-3.5 text-rose-400" />
        )}
        <span>Turn Everything Off</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Confirmation Modal / Popover */}
      {isOpenConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-in fade-in duration-150"
            onClick={() => setIsOpenConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm z-50 bg-card border border-border p-5 rounded-2xl shadow-2xl shadow-black/80 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  Turn off all running fans?
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This will send an individual power-off command to{" "}
                  <strong>{activeCount}</strong> currently active fan
                  {activeCount > 1 ? "s" : ""}:
                </p>
                <ul className="text-xs text-rose-300/90 list-disc list-inside pt-1">
                  {runningFans.map((f) => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <button
                onClick={() => setIsOpenConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTurnAllOff}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-md shadow-rose-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Turn Off</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
