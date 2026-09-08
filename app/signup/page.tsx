"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Fan as FanIcon,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

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
    <div className="w-full max-w-sm bg-card border border-border p-7 sm:p-8 rounded-3xl shadow-2xl shadow-black/80 space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Branding */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 shadow-xl shadow-cyan-500/25 ring-1 ring-cyan-300/30">
          <FanIcon className="w-8 h-8 animate-spin duration-[6000ms]" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            Create an Account
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Get started with FanControl to manage your Atomberg fans
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span>Full Name (Optional)</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ayush"
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-400" />
            <span>Email Address</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={isSubmitting}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Password (min 6 characters)</span>
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
              className="w-full pl-3.5 pr-11 py-2.5 text-sm rounded-xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              {showPassword ? (
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
          disabled={!email.trim() || !password.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 hover:brightness-110 active:scale-98 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Account...</span>
            </>
          ) : (
            <>
              <span>Sign Up & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center text-xs text-muted-foreground pt-1 border-t border-border/50">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-bold text-cyan-400 hover:text-cyan-300 underline underline-offset-4 ml-1"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4">
      <Suspense
        fallback={
          <div className="w-full max-w-sm h-80 rounded-3xl bg-card border border-border animate-pulse flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        }
      >
        <SignupForm />
      </Suspense>
    </div>
  );
}
