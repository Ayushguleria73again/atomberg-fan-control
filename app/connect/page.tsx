"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";

export default function ConnectPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showRefreshToken, setShowRefreshToken] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [existingConnection, setExistingConnection] = useState<{
    connected: boolean;
    createdAt?: string;
    lastUsedAt?: string;
  } | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/connect")
      .then((res) => res.json())
      .then((data) => {
        if (data.connected) {
          setExistingConnection(data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingStatus(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!apiKey.trim()) {
      setErrorMessage("Please enter your Atomberg API Key.");
      return;
    }
    if (!refreshToken.trim()) {
      setErrorMessage("Please enter your Atomberg Refresh Token.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, refreshToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to verify and connect credentials.");
      }

      toast.success("Atomberg account connected successfully!");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your Atomberg account?")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/connect", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to disconnect account.");
      }

      setExistingConnection(null);
      toast.success("Disconnected successfully.");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Disconnect failed";
      toast.error(msg);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto py-6 px-4 space-y-6">
      {/* Back button & title bar with Theme Toggle */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--accent)] hover:text-[var(--accent-press)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Header card */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-[26px] font-bold text-[var(--text)] tracking-[-0.02em]">
          Connect Atomberg
        </h1>
        <p className="text-[14px] text-[var(--text-secondary)]">
          Control your fans using your own Atomberg cloud credentials.
        </p>
      </div>

      {/* Existing Connection Status Card */}
      {existingConnection?.connected && (
        <div className="p-4 rounded-[18px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)] space-y-3">
          <div className="flex items-center gap-2 text-[var(--success)] text-[14px] font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Account Currently Connected</span>
          </div>
          <p className="text-[12px] text-[var(--text-secondary)]">
            Connected on {new Date(existingConnection.createdAt || "").toLocaleDateString()}.
            Your credentials are authenticated and encrypted.
          </p>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] text-[13px] font-semibold text-[var(--danger)] bg-[var(--surface-2)] border border-[var(--border)] hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDisconnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            <span>Disconnect Account</span>
          </button>
        </div>
      )}

      {/* Connection Form */}
      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-[22px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)] space-y-4"
      >
        <div className="space-y-1">
          <label
            htmlFor="apiKey"
            className="block text-[13px] font-semibold text-[var(--text)]"
          >
            API Key
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. atomb_live_..."
              className="w-full px-3.5 py-2.5 text-[15px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none pr-10 font-mono text-[13px]"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              aria-label={showApiKey ? "Hide API Key" : "Show API Key"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text)] border-0 bg-transparent p-1 cursor-pointer"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="refreshToken"
            className="block text-[13px] font-semibold text-[var(--text)]"
          >
            Refresh Token
          </label>
          <div className="relative">
            <input
              id="refreshToken"
              type={showRefreshToken ? "text" : "password"}
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="Paste your long refresh token"
              className="w-full px-3.5 py-2.5 text-[15px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none pr-10 font-mono text-[13px]"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowRefreshToken(!showRefreshToken)}
              aria-label={showRefreshToken ? "Hide Refresh Token" : "Show Refresh Token"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text)] border-0 bg-transparent p-1 cursor-pointer"
            >
              {showRefreshToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-[12px] bg-[var(--surface-2)] border border-[var(--danger)] text-[var(--danger)] text-[13px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-[12px] text-[15px] font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-press)] transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border-0 shadow-sm"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying with Atomberg…</span>
            </>
          ) : (
            <span>{existingConnection?.connected ? "Update Credentials" : "Connect Fans"}</span>
          )}
        </button>

        {/* Privacy Note */}
        <div className="pt-2 flex items-center justify-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
          <span>Encrypted with AES-256-GCM · Never logged</span>
        </div>
      </form>

      {/* How to get credentials helper */}
      <div className="p-5 rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)] space-y-3">
        <div className="flex items-center gap-2 text-[14px] font-bold text-[var(--text)]">
          <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
          <span>How to find your credentials</span>
        </div>
        <ol className="text-[13px] text-[var(--text-secondary)] space-y-2 pl-4 list-decimal leading-relaxed">
          <li>Open the <strong>Atomberg Home</strong> mobile app.</li>
          <li>Go to <strong>Profile / Settings</strong> → Tap <strong>Developer Options</strong>.</li>
          <li>Generate and copy your <strong>API Key</strong> and <strong>Refresh Token</strong>.</li>
          <li>Paste them above and tap <strong>Connect Fans</strong>.</li>
        </ol>
        <div className="pt-1">
          <a
            href="https://developer.atomberg-iot.com/#overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-[var(--accent)] font-semibold hover:underline"
          >
            <span>Official Atomberg Developer Docs</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
