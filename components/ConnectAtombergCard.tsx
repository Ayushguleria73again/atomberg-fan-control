"use client";

import React from "react";
import Link from "next/link";
import { KeyRound, Shield, ArrowRight } from "lucide-react";

export function ConnectAtombergCard({ userEmail }: { userEmail?: string }) {
  return (
    <div className="w-full max-w-lg mx-auto my-12 p-8 sm:p-10 rounded-[24px] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow)] text-center space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 rounded-[20px] bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mx-auto">
        <KeyRound className="w-8 h-8" />
      </div>

      {/* Main Copy */}
      <div className="space-y-2">
        <h2 className="text-[22px] sm:text-[24px] font-bold text-[var(--text)] tracking-[-0.02em]">
          Connect your Atomberg fans
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
          Link your Atomberg API key and refresh token to control your fans from anywhere.
        </p>
      </div>

      {/* Privacy Line */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-[12px] text-[var(--text-secondary)] font-medium border border-[var(--border)]">
        <Shield className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span>Stored encrypted (AES-256-GCM) · Never shared</span>
      </div>

      {/* CTA Button */}
      <div className="pt-2">
        <Link
          href="/connect"
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-[14px] text-[15px] font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-press)] transition-colors active:scale-[0.98] shadow-sm"
        >
          <span>Connect Account</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {userEmail && (
        <p className="text-[12px] text-[var(--text-tertiary)] pt-2">
          Logged in as {userEmail}
        </p>
      )}
    </div>
  );
}
