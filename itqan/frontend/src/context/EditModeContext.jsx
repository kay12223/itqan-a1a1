import { createContext, useContext, useState, useCallback, useEffect } from "react";
import axios from "axios";

const EditModeContext = createContext(null);
const SECRET = "23534858";
const MASTER = "701D#V0id_M4st3r$K3y!99X";
const STORAGE_KEY = "itqan_visual_edits";
const TEXT_STORAGE_KEY = "itqan_site_texts";

const API = axios.create({ baseURL: "/api" });

function loadEdits() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function loadTexts() {
  try { return JSON.parse(localStorage.getItem(TEXT_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

export function EditModeProvider({ children }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [codePrompt, setCodePrompt] = useState(false);
  const [promptStep, setPromptStep] = useState(1);   // 1 = confirm key, 2 = master key
  const [codeEditorOpen, setCodeEditorOpen] = useState(false);
  const [ownerPanelOpen, setOwnerPanelOpen] = useState(false);
  const [edits, setEdits] = useState(() => loadEdits());
  const [texts, setTexts] = useState(() => loadTexts());
  const [globalSaving, setGlobalSaving] = useState(false);

  // Step 1: verify DESIGN_SECRET → advance to step 2
  const activateStep1 = useCallback((code) => {
    if (code === SECRET) {
      setPromptStep(2);
      return true;
    }
    return false;
  }, []);

  // Step 2: verify VOID_MASTER_KEY → open owner panel
  const activateStep2 = useCallback((code) => {
    if (code === MASTER) {
      setCodePrompt(false);
      setPromptStep(1);
      setOwnerPanelOpen(true);
      return true;
    }
    return false;
  }, []);

  // Legacy single-step activate (for code editor via Ctrl+Shift+E)
  const activate = useCallback((code) => {
    if (code === SECRET) {
      setIsEditMode(true);
      setCodePrompt(false);
      setCodeEditorOpen(true);
      return true;
    }
    return false;
  }, []);

  const openCodeEditor = useCallback(() => setCodeEditorOpen(true), []);
  const closeCodeEditor = useCallback(() => setCodeEditorOpen(false), []);

  const deactivate = useCallback(() => setIsEditMode(false), []);
  const openPrompt = useCallback(() => setCodePrompt(true), []);
  const closePrompt = useCallback(() => setCodePrompt(false), []);

  const saveEdit = useCallback((eid, style) => {
    setEdits((prev) => {
      const next = { ...prev, [eid]: { ...prev[eid], ...style } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeEdit = useCallback((eid) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[eid];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const saveText = useCallback((key, value) => {
    setTexts((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(TEXT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setEdits({});
  }, []);

  const resetAllTexts = useCallback(() => {
    localStorage.removeItem(TEXT_STORAGE_KEY);
    setTexts({});
  }, []);

  const saveGlobalTexts = useCallback(async (textsToSave) => {
    setGlobalSaving(true);
    try {
      await API.post("/void/site-content", { secret: SECRET, texts: textsToSave });
      return { ok: true, msg: "✅ حُفظت النصوص — ستظهر لجميع المستخدمين" };
    } catch (e) {
      return { ok: false, msg: "❌ فشل الحفظ العالمي" };
    } finally {
      setGlobalSaving(false);
    }
  }, []);

  const saveGlobalCSSVars = useCallback(async (vars) => {
    setGlobalSaving(true);
    try {
      await API.post("/void/site-content", { secret: SECRET, css_vars: vars });
      return { ok: true, msg: "✅ حُفظت الألوان — ستظهر لجميع المستخدمين" };
    } catch (e) {
      return { ok: false, msg: "❌ فشل الحفظ العالمي" };
    } finally {
      setGlobalSaving(false);
    }
  }, []);

  const saveGlobalCustomCSS = useCallback(async (css) => {
    setGlobalSaving(true);
    try {
      await API.post("/void/site-content", { secret: SECRET, custom_css: css });
      return { ok: true, msg: "✅ حُفظ الـ CSS — سيطبّق على جميع المستخدمين" };
    } catch (e) {
      return { ok: false, msg: "❌ فشل الحفظ" };
    } finally {
      setGlobalSaving(false);
    }
  }, []);

  const readSourceFile = useCallback(async (path) => {
    const { data } = await API.post("/void/read-file", { secret: SECRET, path });
    return data;
  }, []);

  const writeSourceFile = useCallback(async (path, content) => {
    const { data } = await API.post("/void/write-file", { secret: SECRET, path, content });
    return data;
  }, []);

  const listSourceFiles = useCallback(async () => {
    const { data } = await API.post("/void/list-files", { secret: SECRET, path: "" });
    return data.files || [];
  }, []);

  const aiCodeEdit = useCallback(async (prompt, file_path, file_content) => {
    const { data } = await API.post("/void/ai-code", { secret: SECRET, prompt, file_path, file_content });
    return data;
  }, []);

  const setSiteNotice = useCallback(async (message, notice_type, active) => {
    const { data } = await API.post("/void/site-notice", { secret: SECRET, message, notice_type, active });
    return data;
  }, []);

  const uploadAsset = useCallback(async (file) => {
    const form = new FormData();
    form.append("secret", SECRET);
    form.append("file", file);
    const { data } = await API.post("/void/upload-asset", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  }, []);

  const openOwnerPanel  = useCallback(() => setOwnerPanelOpen(true), []);
  const closeOwnerPanel = useCallback(() => { setOwnerPanelOpen(false); setPromptStep(1); }, []);

  return (
    <EditModeContext.Provider value={{
      isEditMode, codePrompt, globalSaving, promptStep,
      codeEditorOpen, openCodeEditor, closeCodeEditor,
      ownerPanelOpen, openOwnerPanel, closeOwnerPanel,
      activate, activateStep1, activateStep2, deactivate,
      openPrompt, closePrompt,
      edits, saveEdit, removeEdit, resetAll,
      texts, saveText, resetAllTexts,
      saveGlobalTexts, saveGlobalCSSVars, saveGlobalCustomCSS,
      readSourceFile, writeSourceFile, listSourceFiles,
      aiCodeEdit, setSiteNotice, uploadAsset,
      SECRET, MASTER,
    }}>
      {children}
    </EditModeContext.Provider>
  );
}

export const useEditMode = () => useContext(EditModeContext);
