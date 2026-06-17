"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export function LangSwitch() {
  const { locale, setLocale } = useI18n();

  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5 text-xs">
      <button
        onClick={() => setLocale("zh")}
        className={cn(
          "px-2 py-1 rounded-md font-medium transition-colors",
          locale === "zh"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        中文
      </button>
      <button
        onClick={() => setLocale("en")}
        className={cn(
          "px-2 py-1 rounded-md font-medium transition-colors",
          locale === "en"
            ? "bg-white text-gray-900 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        )}
      >
        EN
      </button>
    </div>
  );
}
