"use client";

import { useEffect, useState } from "react";

type ThemeMode = "auto" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("auto");

  useEffect(() => {
    const saved = (localStorage.getItem("fc_theme") as ThemeMode) || "auto";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === "auto") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", mode);
    }
    localStorage.setItem("fc_theme", mode);
  }

  function handleSelect(mode: ThemeMode) {
    setTheme(mode);
    applyTheme(mode);
  }

  return (
    <div
      className="inline-flex bg-[var(--surface-2)] rounded-full p-[3px] gap-[2px] border border-[var(--border)]"
      role="group"
      aria-label="Theme selector"
    >
      <button
        type="button"
        onClick={() => handleSelect("auto")}
        aria-pressed={theme === "auto"}
        className={`border-0 font-medium text-[12.5px] px-3 py-1 rounded-full cursor-pointer transition-all duration-200 ${
          theme === "auto"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-sm font-semibold"
            : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
        }`}
      >
        Auto
      </button>
      <button
        type="button"
        onClick={() => handleSelect("light")}
        aria-pressed={theme === "light"}
        className={`border-0 font-medium text-[12.5px] px-3 py-1 rounded-full cursor-pointer transition-all duration-200 ${
          theme === "light"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-sm font-semibold"
            : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => handleSelect("dark")}
        aria-pressed={theme === "dark"}
        className={`border-0 font-medium text-[12.5px] px-3 py-1 rounded-full cursor-pointer transition-all duration-200 ${
          theme === "dark"
            ? "bg-[var(--surface)] text-[var(--text)] shadow-sm font-semibold"
            : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)]"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
