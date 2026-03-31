"use client";

import { useLanguage } from "@/app/contexts/language-context";

interface LanguageToggleProps {
  variant?: "sidebar" | "navbar";
}

export function LanguageToggle({ variant = "navbar" }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === "sidebar") {
    return (
      <div className="flex items-center gap-1 p-1 bg-gray-800 dark:bg-slate-800 rounded-lg w-full">
        <button
          onClick={() => setLanguage("es")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
            language === "es"
              ? "bg-gray-700 dark:bg-slate-600 shadow-sm text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🇪🇸 ES
        </button>
        <button
          onClick={() => setLanguage("en")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
            language === "en"
              ? "bg-gray-700 dark:bg-slate-600 shadow-sm text-white"
              : "text-gray-400 hover:text-white"
          }`}
        >
          🇺🇸 EN
        </button>
      </div>
    );
  }

  // navbar variant
  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800 rounded-lg">
      <button
        onClick={() => setLanguage("es")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          language === "es"
            ? "bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
        }`}
      >
        🇪🇸 ES
      </button>
      <button
        onClick={() => setLanguage("en")}
        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
          language === "en"
            ? "bg-white dark:bg-slate-700 shadow-sm text-gray-900 dark:text-white"
            : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
        }`}
      >
        🇺🇸 EN
      </button>
    </div>
  );
}
