"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Fan,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";
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
      // 1. Cancel ongoing refetches to prevent overwriting optimistic state
      await queryClient.cancelQueries({ queryKey: ["fans"] });

      // 2. Snapshot previous state
      const previousData = queryClient.getQueryData<FansApiResponse>(["fans"]);

      // 3. Apply optimistic update to local cache
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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 border ${
        !isOnline
          ? "bg-card/40 border-border/40 opacity-75 grayscale-[20%]"
          : isPowerOn
          ? "bg-gradient-to-b from-card via-card to-cyan-950/25 border-cyan-500/40 shadow-xl shadow-cyan-950/20 ring-1 ring-cyan-500/20"
          : "bg-card border-border hover:border-border/80 shadow-md shadow-black/20"
      }`}
    >
      {/* Top row: Name, Room, Online Status, Power Toggle */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {fan.name}
            </h3>
            <span className="px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider bg-secondary/80 text-muted-foreground rounded-md border border-border/50">
              {fan.room}
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {fan.series} • {fan.model} • #{fan.id.slice(-4)}
          </p>
        </div>

        {/* Status + Main Power Action */}
        <div className="flex items-center gap-2 shrink-0">
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${
              isOnline
                ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40"
                : "bg-rose-950/40 text-rose-300 border-rose-800/40"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-400" />
                <span>Offline</span>
              </>
            )}
          </div>
          <PowerToggle
            power={fan.power}
            online={isOnline}
            isPending={activeAction === "power"}
            onToggle={(newPower) => handleCommand("power", newPower)}
          />
        </div>
      </div>

      {/* Offline Warning Banner when disconnected */}
      {!isOnline && (
        <div className="mb-4 flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            Device offline. Controls disabled until fan reconnects to Wi-Fi.
          </span>
        </div>
      )}

      {/* Fan Status / Animated State Display */}
      <div className="my-4 flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/50">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl transition-colors duration-300 ${
              isPowerOn
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Fan
              className={`w-7 h-7 transition-all ${
                isPowerOn
                  ? `animate-spin duration-[${Math.max(
                      300,
                      1800 - fan.speed * 250
                    )}ms]`
                  : ""
              }`}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Power</div>
            <div className="text-base font-bold text-foreground">
              {isPowerOn ? "Running" : isOnline ? "Standby" : "Offline"}
            </div>
          </div>
        </div>

        {/* Speed Callout */}
        <div className="text-right">
          <div className="text-xs text-muted-foreground font-medium">Speed Level</div>
          <div className="text-2xl font-black text-foreground">
            {isPowerOn ? fan.speed : 0}
            <span className="text-xs text-muted-foreground font-normal ml-1">
              / 6
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Speed Control (Debounced) */}
      <div className="mb-4">
        <SpeedControl
          speed={fan.speed}
          power={fan.power}
          online={isOnline}
          onSpeedChange={(newSpeed) => handleCommand("speed", newSpeed)}
        />
      </div>

      {/* Secondary Feature Controls: LED Underlight, Sleep, Timer */}
      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-border/40">
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
