"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { NormalizedFanState, FanAction, FansApiResponse } from "@/lib/types";
import { PowerToggle } from "./PowerToggle";
import { SpeedControl } from "./SpeedControl";
import { LedToggle } from "./LedToggle";
import { SleepToggle } from "./SleepToggle";
import { TimerMenu } from "./TimerMenu";
import { toast } from "sonner";

interface FanCardProps {
  fan: NormalizedFanState;
}

export function FanCard({ fan }: FanCardProps) {
  const queryClient = useQueryClient();
  const [activeAction, setActiveAction] = useState<FanAction | null>(null);

  const isOnline = fan.online;
  const isPowerOn = fan.power && isOnline;

  const mutation = useMutation({
    mutationFn: async ({
      action,
      value,
    }: {
      action: FanAction;
      value: boolean | number;
    }) => {
      setActiveAction(action);
      const res = await fetch(`/api/fans/${fan.id}/cmd`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, value }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send command to fan");
      }

      return res.json();
    },
    onMutate: async ({ action, value }) => {
      await queryClient.cancelQueries({ queryKey: ["fans"] });
      const previousData = queryClient.getQueryData<FansApiResponse>(["fans"]);

      if (previousData) {
        const updatedFans = previousData.fans.map((f) => {
          if (f.id !== fan.id) return f;

          const updated = { ...f, lastUpdated: Date.now() };
          switch (action) {
            case "power":
              updated.power = Boolean(value);
              break;
            case "speed":
              updated.speed = Number(value);
              updated.power = true;
              break;
            case "led":
              updated.led = Boolean(value);
              break;
            case "sleep":
              updated.sleep = Boolean(value);
              break;
            case "timer":
              updated.timerHours = Number(value);
              break;
          }
          return updated;
        });

        queryClient.setQueryData<FansApiResponse>(["fans"], {
          ...previousData,
          fans: updatedFans,
        });
      }

      return { previousData };
    },
    onError: (err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(["fans"], context.previousData);
      }
      toast.error(`Command failed: ${err.message}`);
    },
    onSuccess: (_data, variables) => {
      const actionName =
        variables.action === "power"
          ? variables.value
            ? "Turned On"
            : "Turned Off"
          : variables.action === "speed"
          ? `Speed set to ${variables.value}`
          : variables.action === "led"
          ? `Underlight ${variables.value ? "On" : "Off"}`
          : variables.action === "sleep"
          ? `Sleep mode ${variables.value ? "Activated" : "Deactivated"}`
          : `Timer set to ${variables.value}h`;

      toast.success(`${fan.name}: ${actionName}`);
    },
    onSettled: () => {
      setActiveAction(null);
    },
  });

  const handleCommand = (action: FanAction, value: boolean | number) => {
    mutation.mutate({ action, value });
  };

  const spinDuration = isPowerOn ? `${Math.max(0.6, 4.2 - fan.speed * 0.45)}s` : "0s";

  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--border)] rounded-[20px] p-[18px] sm:p-[20px] flex flex-col gap-4 shadow-[var(--shadow)] transition-all duration-200 ${
        !isOnline ? "opacity-50" : ""
      }`}
    >
      {/* Card Header: Emblem + Name/Room/Status + iOS Power Switch */}
      <div className="flex items-center gap-3.5">
        {/* Fan Emblem with Spinning Blades */}
        <div
          className={`w-[44px] h-[44px] rounded-[13px] shrink-0 flex items-center justify-center transition-colors duration-200 ${
            isPowerOn
              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
              : "bg-[var(--surface-2)] text-[var(--text-tertiary)]"
          }`}
        >
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <g
              className={isPowerOn ? "spin-blades" : ""}
              style={{ "--spin-duration": spinDuration } as React.CSSProperties}
            >
              <path d="M12 12c0-3 .5-5 2-6 1.8-1.2 4 0 4 2 0 1.6-2 3-6 4z" />
              <path d="M12 12c3 0 5 .5 6 2 1.2 1.8 0 4-2 4-1.6 0-3-2-4-6z" />
              <path d="M12 12c0 3-.5 5-2 6-1.8 1.2-4 0-4-2 0-1.6 2-3 6-4z" />
              <path d="M12 12c-3 0-5-.5-6-2-1.2-1.8 0-4 2-4 1.6 0 3 2 4 6z" />
            </g>
            <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          </svg>
        </div>

        {/* Fan Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[17px] font-semibold text-[var(--text)] tracking-[-0.01em] truncate">
              {fan.name}
            </span>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
              {fan.room}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">
            <span
              className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                !isOnline
                  ? "bg-[var(--danger)]"
                  : isPowerOn
                  ? "bg-[var(--success)]"
                  : "bg-[var(--text-tertiary)]"
              }`}
            />
            <span>
              {!isOnline ? "Offline" : isPowerOn ? "Running" : "Standby"}
            </span>
          </div>
        </div>

        {/* Primary Power Switch */}
        <PowerToggle
          power={fan.power}
          online={isOnline}
          isPending={activeAction === "power"}
          onToggle={(newPower) => handleCommand("power", newPower)}
          fanName={fan.name}
        />
      </div>

      {/* Offline message if device is not reachable */}
      {!isOnline && (
        <div className="text-[12px] text-[var(--danger)] font-medium bg-[var(--surface-2)] p-2 rounded-[10px] border border-[var(--border)] text-center">
          Fan is offline. Please check its Wi-Fi connection.
        </div>
      )}

      {/* Speed Control */}
      <SpeedControl
        speed={fan.speed}
        power={fan.power}
        online={isOnline}
        onSpeedChange={(newSpeed) => handleCommand("speed", newSpeed)}
      />

      {/* Auxiliary Secondary Toggles */}
      <div className={`grid grid-cols-3 gap-2 transition-opacity duration-200 ${!isPowerOn || !isOnline ? "opacity-50 pointer-events-none" : ""}`}>
        <LedToggle
          led={fan.led}
          online={isOnline}
          isPending={activeAction === "led"}
          onToggle={(newLed) => handleCommand("led", newLed)}
        />
        <SleepToggle
          sleep={fan.sleep}
          power={fan.power}
          online={isOnline}
          isPending={activeAction === "sleep"}
          onToggle={(newSleep) => handleCommand("sleep", newSleep)}
        />
        <TimerMenu
          timerHours={fan.timerHours}
          online={isOnline}
          isPending={activeAction === "timer"}
          onSelectTimer={(hours) => handleCommand("timer", hours)}
        />
      </div>
    </div>
  );
}
