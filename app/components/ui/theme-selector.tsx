"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

const THEMES = [
  { value: "light",  label: "Claro",   icon: Sun },
  { value: "dark",   label: "Oscuro",  icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

interface ThemeSelectorProps {
  variant?: "sidebar" | "navbar";
}

export function ThemeSelector({ variant = "navbar" }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  if (variant === "sidebar") {
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-800 dark:bg-slate-800 rounded-lg w-full">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5
              rounded-md text-xs font-medium transition-all duration-150
              ${theme === value
                ? "bg-gray-700 dark:bg-slate-600 shadow-sm text-white"
                : "text-gray-400 hover:text-white"
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    );
  }

  // navbar variant
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
      {THEMES.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          title={label}
          className={`
            flex items-center gap-1.5 px-3 py-1.5
            rounded-md text-xs font-medium
            transition-all duration-150
            ${theme === value
              ? "bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white"
              : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            }
          `}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
