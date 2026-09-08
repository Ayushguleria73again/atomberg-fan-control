"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  AlertCircle,
  KeyRound,
  RotateCw,
} from "lucide-react";
import { FanCard } from "@/components/FanCard";
import { RefreshButton } from "@/components/RefreshButton";
import { TurnAllOffButton } from "@/components/TurnAllOffButton";
import { VoiceButton } from "@/components/VoiceButton";
import { ThemeToggle } from "@/components/ThemeToggle";
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

  // 1. Current user session and connection status
  const { data: authData, isLoading: isAuthLoading } = useQuery<AuthMeResponse>({
    queryKey: ["authMe"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to check auth status");
      return res.json();
    },
  });

  // 2. Multi-tenant fans state
  const {
    data,
    error,
    isLoading,
    isError,
    dataUpdatedAt,
    refetch,
  } = useQuery<FansApiResponse>({
    queryKey: ["fans"],
    queryFn: async () => {
      const res = await fetch("/api/fans");
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch fan data");
      }
      return res.json();
    },
    enabled: authData?.authenticated && authData?.hasConnection !== false,
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
      toast.success("Fan status refreshed!");
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

  const showConnectEmptyState =
    !isAuthLoading &&
    authData?.authenticated &&
    authData?.hasConnection === false;

  return (
    <main className="w-full max-w-4xl mx-auto flex flex-col gap-4 pb-20 safe-bottom">
      {/* App Header / Titlebar matching mockup */}
      <header className="flex flex-col gap-3 pt-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[29px] font-bold text-[var(--text)] tracking-[-0.022em] leading-tight m-0">
              Fans
            </h1>
            <div className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] font-medium mt-0.5">
              <span>
                {authData?.user?.name || authData?.user?.email || "Home"} · {fans.length} {fans.length === 1 ? "fan" : "fans"}
              </span>
              <Link
                href="/connect"
                title="Manage Atomberg Credentials"
                className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline text-[12px] font-medium"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>BYOK</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>

        {/* Status row: Running count & Refresh */}
        {!showConnectEmptyState && (
          <div className="flex items-center justify-between gap-2.5 text-[13px] text-[var(--text-secondary)] font-medium pt-0.5">
            <span className="text-[var(--text)] font-semibold">
              <b className="text-[var(--success)]">{runningCount}</b> of {fans.length} running
            </span>
            <RefreshButton
              onRefresh={handleManualRefresh}
              isFetching={isManualRefreshing || isLoading}
              lastUpdated={dataUpdatedAt}
            />
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {showConnectEmptyState ? (
        <ConnectAtombergCard userEmail={authData?.user?.email} />
      ) : (
        <>
          {/* Main Fans Responsive Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)] animate-pulse flex items-center justify-center text-[var(--text-secondary)] text-[13px]"
                >
                  Loading fans…
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)] text-center space-y-4">
              <AlertCircle className="w-10 h-10 text-[var(--danger)] mx-auto" />
              <div className="space-y-1">
                <h3 className="text-[17px] font-bold text-[var(--text)]">
                  Unable to load fan state
                </h3>
                <p className="text-[13px] text-[var(--text-secondary)] max-w-md mx-auto">
                  {error instanceof Error
                    ? error.message
                    : "Failed to connect to Atomberg Cloud. Please check your credentials."}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-4 py-2 text-[13px] font-semibold rounded-[10px] bg-[var(--accent)] text-white hover:bg-[var(--accent-press)] transition-colors cursor-pointer border-0"
                >
                  Retry
                </button>
                <Link
                  href="/connect"
                  className="px-4 py-2 text-[13px] font-semibold rounded-[10px] bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--border)] transition-colors"
                >
                  Check Credentials
                </Link>
              </div>
            </div>
          ) : fans.length === 0 ? (
            <div className="p-8 rounded-[20px] bg-[var(--surface)] border border-[var(--border)] text-center space-y-2">
              <p className="text-[14px] text-[var(--text-secondary)]">
                No fans found on your connected Atomberg account.
              </p>
              <Link
                href="/connect"
                className="text-[13px] font-semibold text-[var(--accent)] hover:underline"
              >
                Update Atomberg Credentials →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3.5">
              {fans.map((fan) => (
                <FanCard key={fan.id} fan={fan} />
              ))}
            </div>
          )}

          {/* Turn Everything Off Action Button */}
          {fans.length > 0 && (
            <div className="pt-1">
              <TurnAllOffButton fans={fans} />
            </div>
          )}

          {/* Voice FAB */}
          <VoiceButton fans={fans} />
        </>
      )}
    </main>
  );
}
