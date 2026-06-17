"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Locale } from "./dictionaries";
import { DICT } from "./dictionaries";

// ── Types ────────────────────────────────────────────────
type DictSection = keyof typeof DICT;

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: <S extends DictSection>(section: S) => (typeof DICT)[S]["zh"];
}

// ── Context ──────────────────────────────────────────────
const I18nContext = createContext<I18nContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("zh");

  /** Get translated dictionary for a section */
  const t = useCallback(
    <S extends DictSection>(section: S): (typeof DICT)[S]["zh"] => {
      return DICT[section][locale] as (typeof DICT)[S]["zh"];
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

// ── Server-compatible helpers ────────────────────────────
/** Get dictionary for a section in a given locale (usable in server components) */
export function getDict<S extends DictSection>(
  section: S,
  locale: Locale
): (typeof DICT)[S]["zh"] {
  return DICT[section][locale] as (typeof DICT)[S]["zh"];
}
