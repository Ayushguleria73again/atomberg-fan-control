"use client";

import React from "react";
import {
  Key,
  ShieldCheck,
  ArrowRight,
  Smartphone,
  ExternalLink,
  Lock,
} from "lucide-react";

export function ConnectAtombergCard({ userEmail }: { userEmail?: string }) {
  return (
    <div className="w-full max-w-2xl mx-auto my-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-card via-card to-cyan-950/20 border border-cyan-500/30 shadow-2xl shadow-cyan-950/20 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              Connect Your Atomberg Account
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Logged in as <strong className="text-foreground">{userEmail || "User"}</strong>
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          BYOK Model
        </span>
      </div>

      {/* Explanation Steps */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          How to get your credentials in 60 seconds:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                1
              </span>
              <span>Atomberg App</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Open the Atomberg Home app on your phone and verify your fans.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                2
              </span>
              <span>Developer Mode</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Go to Profile → Settings → Enable Developer Options.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/50 space-y-1.5">
            <div className="font-bold text-foreground flex items-center gap-1.5">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px]">
                3
              </span>
              <span>Copy Keys</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Copy your API Key and Refresh Token to connect your fans.
            </p>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-secondary/30 border border-border/40 text-xs text-muted-foreground">
        <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>AES-256-GCM Encrypted:</strong> Your credentials are encrypted at rest with per-record nonces. Never logged or exposed to the client.
        </span>
      </div>

      {/* CTA Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <a
          href="https://developer.atomberg-iot.com/#overview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
        >
          <span>Official Developer Docs</span>
          <ExternalLink className="w-3 h-3" />
        </a>

        <button
          onClick={() => {
            alert("Phase B will provide the credential connection modal!");
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-tr from-cyan-600 to-sky-400 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/25"
        >
          <span>Connect Atomberg Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
