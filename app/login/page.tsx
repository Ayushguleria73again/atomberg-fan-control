"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Fan as FanIcon,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [passcode, setPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", passcode: passcode.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Incorrect passcode.");
      }

      // Successful login -> Redirect back to original path or /
      const returnTo = searchParams.get("from") || "/";
      router.push(returnTo);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm bg-card border border-border p-7 sm:p-8 rounded-3xl shadow-2xl shadow-black/80 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Branding & Icon */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="relative p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 shadow-xl shadow-cyan-500/25 ring-1 ring-cyan-300/30">
          <FanIcon className="w-8 h-8 animate-spin duration-[6000ms]" />
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-slate-950 text-cyan-400 border border-border">
            <Lock className="w-3 h-3" />
          </div>
        </div>
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight">
            FanControl Gate
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Protected Atomberg Cloud IoT Dashboard
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="passcode"
            className="text-xs font-semibold text-muted-foreground"
          >
            App Passcode
          </label>
          <div className="relative">
            <input
              id="passcode"
              type={showPasscode ? "text" : "password"}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter passcode..."
              required
              autoFocus
              disabled={isSubmitting}
              className="w-full pl-4 pr-11 py-2.5 text-sm rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPasscode ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/20 border border-destructive/40 text-rose-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!passcode.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 hover:brightness-110 active:scale-98 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <span>Unlock Fan Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security badge note */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/50 text-center">
        <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Session persists across home-screen PWA launches.</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm h-80 rounded-3xl bg-card border border-border animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
