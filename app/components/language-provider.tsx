"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "es";
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void };

const LanguageContext = createContext<LanguageContextValue>({ language: "en", setLanguage: () => undefined });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");
  useEffect(() => { const saved = window.localStorage.getItem("uccw_language"); if (saved === "es") setLanguageState("es"); }, []);
  function setLanguage(next: Language) { setLanguageState(next); window.localStorage.setItem("uccw_language", next); document.documentElement.lang = next; }
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <div className="language-switcher" role="group" aria-label="Language selector">
    <button type="button" className={language === "en" ? "active" : ""} onClick={() => setLanguage("en")}>EN</button>
    <button type="button" className={language === "es" ? "active" : ""} onClick={() => setLanguage("es")}>ES</button>
  </div>;
}

