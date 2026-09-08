"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration error";
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4 pt-2 sm:pt-4">
      {/* Top Bar with Theme Toggle */}
      <div className="flex items-center justify-end">
        <ThemeToggle />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] p-7 sm:p-8 rounded-[24px] shadow-[var(--shadow)] space-y-6 animate-in fade-in duration-150">
        {/* Emblem & Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-14 h-14 rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <g className="spin-blades" style={{ "--spin-duration": "6s" } as React.CSSProperties}>
                <path d="M12 12c0-3 .5-5 2-6 1.8-1.2 4 0 4 2 0 1.6-2 3-6 4z" />
                <path d="M12 12c3 0 5 .5 6 2 1.2 1.8 0 4-2 4-1.6 0-3-2-4-6z" />
                <path d="M12 12c0 3-.5 5-2 6-1.8 1.2-4 0-4-2 0-1.6 2-3 6-4z" />
                <path d="M12 12c-3 0-5-.5-6-2-1.2-1.8 0-4 2-4 1.6 0 3 2 4 6z" />
              </g>
              <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div>
            <h1 className="text-[24px] font-bold text-[var(--text)] tracking-[-0.02em]">
              Create Account
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">
              Get started with FanControl BYOK
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="name"
              className="block text-[13px] font-semibold text-[var(--text)]"
            >
              Name (Optional)
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ayush"
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-[16px] sm:text-[14px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-[13px] font-semibold text-[var(--text)]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 text-[16px] sm:text-[14px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="password"
              className="block text-[13px] font-semibold text-[var(--text)]"
            >
              Password (min 6 chars)
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                disabled={isSubmitting}
                className="w-full pl-3.5 pr-10 py-2.5 text-[16px] sm:text-[14px] rounded-[12px] bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text)] p-1 border-0 bg-transparent cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-[12px] bg-[var(--surface-2)] border border-[var(--danger)] text-[var(--danger)] text-[12px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password.trim() || isSubmitting}
            className="w-full py-3 rounded-[12px] text-[15px] font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-press)] transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 border-0 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account…</span>
              </>
            ) : (
              <>
                <span>Sign Up</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className="text-center text-[13px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-[var(--accent)] hover:underline ml-1"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[75vh] px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm h-72 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
