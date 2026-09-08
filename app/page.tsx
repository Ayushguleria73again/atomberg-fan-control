"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Fan as FanIcon,
  ShieldCheck,
  AlertCircle,
  Clock,
  Info,
  Zap,
  User as UserIcon,
} from "lucide-react";
import { FanCard } from "@/components/FanCard";
import { RefreshButton } from "@/components/RefreshButton";
import { ConnectionBadge } from "@/components/ConnectionBadge";
import { TurnAllOffButton } from "@/components/TurnAllOffButton";
import { VoiceButton } from "@/components/VoiceButton";
import { LogoutButton } from "@/components/LogoutButton";
import { ConnectAtombergCard } from "@/components/ConnectAtombergCard";
import { FansApiResponse } from "@/lib/types";
import { toast } from "sonner";

interface AuthMeResponse {
  authenticated: boolean;
  user: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
  hasConnection: boolean;
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // 1. Fetch current user session and connection status
  const { data: authData, isLoading: isAuthLoading } = useQuery<AuthMeResponse>({
    queryKey: ["authMe"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to check auth status");
      return res.json();
    },
  });

  // 2. Fetch fans state
  const { data, error, isLoading, isError, dataUpdatedAt, refetch } =
    useQuery<FansApiResponse>({
      queryKey: ["fans"],
      queryFn: async () => {
        const res = await fetch("/api/fans");
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to fetch fan data");
        }
        return res.json();
      },
      staleTime: 45_000,
    });

  const handleManualRefresh = async () => {
    try {
      setIsManualRefreshing(true);
      const res = await fetch("/api/fans?refresh=1");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to refresh state from cloud");
      }
      const freshData: FansApiResponse = await res.json();
      queryClient.setQueryData(["fans"], freshData);
      toast.success("Fan status refreshed from Atomberg Cloud!");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to refresh fan status";
      toast.error(msg);
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const fans = data?.fans ?? [];
  const runningCount = fans.filter((f) => f.power && f.online).length;
  const lightsCount = fans.filter((f) => f.led && f.online).length;

  const lastUpdatedTime = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  // New User with No Atomberg Connection -> Show Phase A Empty State
  const showConnectEmptyState =
    !isAuthLoading &&
    authData?.authenticated &&
    authData?.hasConnection === false &&
    fans.length === 0;

  return (
    <main className="space-y-6">
      {/* Top Navigation / App Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25 ring-1 ring-cyan-300/30">
            <FanIcon className="w-6 h-6 animate-spin duration-[4000ms]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                FanControl
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 rounded-md">
                BYOK
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {authData?.user?.email ? (
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3 text-cyan-400 inline" />
                  {authData.user.email}
                </span>
              ) : (
                "Direct Atomberg Cloud IoT Management"
              )}
            </p>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <ConnectionBadge />
          <VoiceButton fans={fans} />
          <TurnAllOffButton fans={fans} />
          <RefreshButton
            onRefresh={handleManualRefresh}
            isFetching={isManualRefreshing || isLoading}
          />
          <LogoutButton />
        </div>
      </header>

      {/* If newly registered user with no connected Atomberg credentials */}
      {showConnectEmptyState ? (
        <ConnectAtombergCard userEmail={authData?.user?.email} />
      ) : (
        <>
          {/* Quick Status / Quota Discipline Bar */}
          <section className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-card/60 border border-border/60 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {runningCount} / {fans.length} Running
                </span>
              </div>
              {lightsCount > 0 && (
                <span className="text-amber-300/90 font-medium">
                  • {lightsCount} Light{lightsCount > 1 ? "s" : ""} On
                </span>
              )}
              <div className="hidden md:flex items-center gap-1 text-muted-foreground">
                • <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 inline mx-0.5" />
                Quota Safe: On-demand sync
              </div>
            </div>

            {lastUpdatedTime && (
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Last synced: {lastUpdatedTime}</span>
                {data?.cached && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                    cached
                  </span>
                )}
              </div>
            )}
          </section>

          {/* Main Fans Grid / Loading / Error States */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-64 rounded-2xl bg-card/40 border border-border/40 animate-pulse flex items-center justify-center text-muted-foreground text-xs"
                >
                  Loading fan status from Atomberg cloud...
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 rounded-2xl bg-destructive/10 border border-destructive/30 text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Unable to load fan state
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {error instanceof Error
                    ? error.message
                    : "Failed to connect to Atomberg Cloud API. Please check your credentials."}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-secondary hover:bg-accent text-foreground border border-border"
              >
                Retry Connection
              </button>
            </div>
          ) : fans.length === 0 ? (
            <div className="p-8 rounded-2xl bg-card border border-border text-center space-y-3">
              <Info className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No Atomberg fans were discovered on this account.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {fans.map((fan) => (
                <FanCard key={fan.id} fan={fan} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
