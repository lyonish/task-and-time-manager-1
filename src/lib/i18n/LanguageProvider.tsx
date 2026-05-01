"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { locales, type Locale, type Translations } from "./translations";

interface LanguageContextValue {
  lang: Locale;
  setLang: (lang: Locale) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: locales.en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as Locale | null;
    if (stored && stored in locales) setLangState(stored);
  }, []);

  const setLang = (next: Locale) => {
    setLangState(next);
    localStorage.setItem("lang", next);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: locales[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
