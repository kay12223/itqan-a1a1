import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const ThemeContext = createContext(null);

const API = axios.create({ baseURL: "/api" });

function applyDesignSettings(overrides = {}) {
  try {
    const s = JSON.parse(localStorage.getItem("itqan_design_settings") || "{}");
    const merged = { ...s, ...overrides };
    const root = document.documentElement;
    if (merged.primary) root.style.setProperty("--primary", merged.primary);
    if (merged.accent) root.style.setProperty("--accent", merged.accent);
    if (merged.glow) root.style.setProperty("--glow", merged.glow);
    if (merged.radius) root.style.setProperty("--radius", merged.radius);
    if (merged.fontFamily) document.body.style.fontFamily = merged.fontFamily;
    if (merged.fontSize) document.body.style.fontSize = merged.fontSize + "px";
    if (merged.animationsOff) root.classList.add("no-animations");
  } catch {}
}

function applyGlobalContent(content) {
  if (!content) return;
  const root = document.documentElement;
  const { css_vars = {}, custom_css = "", theme, texts = {} } = content;
  Object.entries(css_vars).forEach(([k, v]) => root.style.setProperty(k, v));
  if (custom_css) {
    let el = document.getElementById("__global_custom_css__");
    if (!el) { el = document.createElement("style"); el.id = "__global_custom_css__"; document.head.appendChild(el); }
    el.textContent = custom_css;
  }
  if (texts && Object.keys(texts).length > 0) {
    try { localStorage.setItem("itqan_site_texts", JSON.stringify(texts)); } catch {}
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("itqan_theme") || "void");
  const [globalContent, setGlobalContent] = useState(null);

  useEffect(() => {
    API.get("/void/site-content").then(({ data }) => {
      setGlobalContent(data);
      applyGlobalContent(data);
      if (data.theme && !localStorage.getItem("itqan_theme")) {
        setTheme(data.theme);
      }
    }).catch(() => {});
    const iv = setInterval(() => {
      API.get("/void/site-content").then(({ data }) => {
        setGlobalContent(data);
        applyGlobalContent(data);
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("void", "clouds", "dark");
    root.classList.add(theme);
    if (theme === "void") root.classList.add("dark");
    root.setAttribute("dir", "rtl");
    root.setAttribute("lang", "ar");
    localStorage.setItem("itqan_theme", theme);
    applyDesignSettings(globalContent?.css_vars || {});
  }, [theme, globalContent]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === "void" ? "clouds" : "void"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle, isVoid: theme === "void", globalContent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
