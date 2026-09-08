"use client";

import React, { useState } from "react";
import { Power, Loader2, AlertTriangle, Check } from "lucide-react";
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

    // Snapshot previous state
    const previousData = queryClient.getQueryData<FansApiResponse>(["fans"]);

    // Optimistic update
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
      const commands = runningFans.map((fan) =>
        fetch(`/api/fans/${fan.id}/cmd`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "power", value: false }),
        }).then(async (res) => {
          const data = await res.json().catch(() => null);
          if (!res.ok || !data) {
            throw new Error(data?.error || `Failed to turn off ${fan.name}`);
          }
          return data;
        })
      );

      await Promise.all(commands);
      toast.success(
        activeCount === 1
          ? "Turned off 1 running fan."
          : `Turned off all ${activeCount} running fans.`
      );
    } catch (err: unknown) {
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
    <>
      <button
        type="button"
        onClick={() => setIsOpenConfirm(true)}
        disabled={activeCount === 0 || isProcessing}
        aria-label="Turn off all fans"
        className="w-full flex items-center justify-center gap-2 bg-[var(--surface)] border border-[var(--border)] rounded-[14px] p-3.5 text-[var(--danger)] font-semibold text-[14.5px] cursor-pointer transition-transform duration-140 active:scale-[0.985] shadow-[var(--shadow)] disabled:opacity-40 disabled:pointer-events-none min-h-[48px]"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin text-[var(--danger)]" />
        ) : (
          <Power className="w-[17px] h-[17px] stroke-[2.2]" />
        )}
        <span>Turn everything off</span>
        {activeCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[11px] font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {/* Confirmation Modal */}
      {isOpenConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-in fade-in duration-150"
            onClick={() => setIsOpenConfirm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm z-50 bg-[var(--surface)] border border-[var(--border)] p-6 rounded-[22px] shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-[12px] bg-[var(--surface-2)] text-[var(--danger)] shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[16px] font-bold text-[var(--text)]">
                  Turn off all fans?
                </h4>
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                  This will turn off <strong>{activeCount}</strong> currently running fan
                  {activeCount > 1 ? "s" : ""}:
                </p>
                <ul className="text-[12px] text-[var(--text)] list-disc list-inside pt-1 font-medium">
                  {runningFans.map((f) => (
                    <li key={f.id}>{f.name}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setIsOpenConfirm(false)}
                className="px-4 py-2 text-[13px] font-semibold rounded-[10px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTurnAllOff}
                className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-[10px] bg-[var(--danger)] text-white hover:opacity-90 transition-opacity cursor-pointer border-0 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
