"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to log out");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      title="Log out"
      aria-label="Log out"
      className="w-[36px] h-[36px] rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text)] flex items-center justify-center cursor-pointer transition-transform duration-150 active:scale-95 disabled:opacity-50"
    >
      {isLoggingOut ? (
        <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
      ) : (
        <LogOut className="w-4 h-4" />
      )}
    </button>
  );
}
