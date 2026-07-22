import { createContext, useContext, useState, useEffect } from "react";
import ar from "@/locales/ar";
import en from "@/locales/en";

const dicts = { ar, en };
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("itqan_lang") || "ar");

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
    localStorage.setItem("itqan_lang", lang);
  }, [lang]);

  const toggleLang = () => setLang((l) => (l === "ar" ? "en" : "ar"));

  /** t("nav.dashboard") → looks up nested keys */
  const t = (key) => {
    const parts = key.split(".");
    let node = dicts[lang];
    for (const p of parts) {
      if (!node) return key;
      node = node[p];
    }
    return node ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, isRTL: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
