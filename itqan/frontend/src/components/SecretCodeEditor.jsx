/**
 * لوحة المصمم السرية — Designer Panel
 * مدير الملفات + محرر الكود + ترمنال حقيقي + ذكاء اصطناعي
 */
import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen, FileCode, Send, Save, Loader2, RefreshCw,
  ChevronRight, ChevronDown, Bot, User, Sparkles,
  CheckCircle2, Copy, X, RotateCcw, Terminal, Plus,
  Folder, File, Trash2, Edit2, MoreVertical, Play,
  ChevronUp, ArrowRight, Download, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────
   شجرة الملفات
───────────────────────────────────────────── */
function FileNode({ node, depth, selectedPath, onSelect, onDelete, onRename }) {
  const [open, setOpen] = useState(depth < 2);
  const [hovered, setHovered] = useState(false);
  const isDir = !!node.children;
  const isSelected = selectedPath === node.path;
  const ext = node.name.split(".").pop()?.toLowerCase();
  const extColor = {
    jsx: "text-cyan-400", js: "text-yellow-400", tsx: "text-cyan-300",
    ts: "text-blue-400", py: "text-green-400", css: "text-pink-400",
    json: "text-orange-400", md: "text-gray-400", html: "text-red-400",
    sh: "text-emerald-400",
  }[ext] || "text-muted-foreground";

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => isDir ? setOpen(o => !o) : onSelect(node.path)}
        className={`group flex items-center gap-1.5 px-2 py-[5px] rounded-md cursor-pointer text-xs transition-all select-none
          ${isSelected ? "bg-primary/20 text-primary font-semibold" : "hover:bg-white/6 text-muted-foreground hover:text-foreground"}`}
        style={{ paddingRight: `${8 + depth * 12}px` }}>
        {isDir
          ? open
            ? <ChevronDown className="h-3 w-3 shrink-0 text-amber-400" />
            : <ChevronRight className="h-3 w-3 shrink-0 text-amber-400" />
          : <FileCode className={`h-3 w-3 shrink-0 ${extColor}`} />}
        <span className="truncate flex-1">{node.name}</span>
      </div>
      {isDir && open && node.children?.map(child => (
        <FileNode key={child.path} node={child} depth={depth + 1}
          selectedPath={selectedPath} onSelect={onSelect}
          onDelete={onDelete} onRename={onRename} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   تحديد لغة Monaco
───────────────────────────────────────────── */
function getLang(path) {
  if (!path) return "javascript";
  const ext = path.split(".").pop().toLowerCase();
  return { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", css: "css", json: "json", md: "markdown", html: "html",
    sh: "shell", txt: "plaintext", yaml: "yaml", yml: "yaml" }[ext] || "plaintext";
}

/* ─────────────────────────────────────────────
   رسالة الذكاء الاصطناعي
───────────────────────────────────────────── */
function AiMsg({ m }) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);
  const codeBlocks = m.content.match(/```[\s\S]*?```/g) || [];
  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const parts = m.content.replace(/```[\s\S]*?```/g, "___CB___").split("___CB___");
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white
        ${isUser ? "gradient-primary" : "bg-violet-500/20 border border-violet-500/30"}`}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-violet-400" />}
      </div>
      <div className={`max-w-[85%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1.5`}>
        <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap
          ${isUser ? "gradient-primary text-white" : "bg-white/5 border border-white/10"}`} dir="rtl">
          {parts.map((part, i) => (
            <span key={i}>
              {part}
              {codeBlocks[i] && (
                <div className="relative mt-2 mb-1 rounded-xl overflow-hidden border border-white/10" dir="ltr">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 text-[10px] text-muted-foreground border-b border-white/5">
                    <span className="flex items-center gap-1"><Terminal className="h-3 w-3" /> code</span>
                    <button onClick={() => copy(codeBlocks[i].replace(/```\w*\n?|\n?```/g, ""))}
                      className="hover:text-foreground transition-colors flex items-center gap-1">
                      {copied ? <><CheckCircle2 className="h-3 w-3 text-green-400" /> تم</> : <><Copy className="h-3 w-3" /> نسخ</>}
                    </button>
                  </div>
                  <pre className="p-3 text-[11px] overflow-x-auto leading-5 bg-black/50 font-mono" style={{ maxHeight: 220 }}>
                    {codeBlocks[i].replace(/```\w*\n?|\n?```/g, "")}
                  </pre>
                </div>
              )}
            </span>
          ))}
        </div>
        {m.applied && (
          <span className="text-[10px] text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> طُبِّق — اضغط حفظ لتثبيت التغيير
          </span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   محرر الكود النصي (fallback بدون Monaco)
───────────────────────────────────────────── */
function CodeTextarea({ value, onChange }) {
  const taRef = useRef(null);
  const numsRef = useRef(null);
  const lines = value.split("\n").length;
  const syncScroll = () => {
    if (numsRef.current && taRef.current)
      numsRef.current.scrollTop = taRef.current.scrollTop;
  };
  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = e.target;
      const v = value.slice(0, s) + "  " + value.slice(end);
      onChange(v);
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.selectionStart = taRef.current.selectionEnd = s + 2;
      });
    }
  };
  return (
    <div className="flex-1 flex overflow-hidden font-mono text-xs" dir="ltr">
      <div ref={numsRef}
        className="overflow-hidden select-none shrink-0 text-right bg-black/40 border-r border-white/5 text-muted-foreground/30 py-2.5"
        style={{ width: 40, overflowY: "hidden" }}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="leading-6 px-1.5" style={{ height: 24 }}>{i + 1}</div>
        ))}
      </div>
      <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={handleTab} onScroll={syncScroll} spellCheck={false}
        className="flex-1 resize-none bg-transparent p-2.5 text-[12px] text-foreground leading-6 outline-none overflow-auto"
        style={{ fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   المكوّن الرئيسي — لوحة المصمم السرية
═══════════════════════════════════════════════════ */
export default function SecretCodeEditor({ onClose }) {
  const [tab, setTab] = useState("editor"); // editor | terminal | ai
  const [tree, setTree] = useState([]);
  const [treeLoading, setTL] = useState(false);
  const [filePath, setFilePath] = useState(null);
  const [code, setCode] = useState("");
  const [origCode, setOrig] = useState("");
  const [fileLoading, setFL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Terminal
  const [termHistory, setTermHistory] = useState([
    { type: "info", text: "🔐 ترمنال المصمم السري — مرحباً بك\n$ اكتب أي أمر shell واضغط Enter أو ▶" }
  ]);
  const [termInput, setTermInput] = useState("");
  const [termRunning, setTermRunning] = useState(false);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const termEndRef = useRef(null);
  const termInputRef = useRef(null);

  // AI Chat
  const [msgs, setMsgs] = useState([{
    role: "ai",
    content: "مرحباً! أنا مساعدك الذكي 🤖\nيمكنني:\n• قراءة وتعديل أي ملف في المشروع\n• إنشاء صفحات وكومبوننتس جديدة\n• إصلاح الأخطاء وتحسين الكود\n• تعديل ألوان وتصميم الموقع\n\nافتح ملفاً من الشجرة أو أخبرني بما تريد مباشرة!"
  }]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiL] = useState(false);
  const chatEndRef = useRef(null);
  const aiInputRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [termHistory]);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  /* ── File Tree ── */
  const loadTree = useCallback(async () => {
    setTL(true);
    try {
      const { data } = await api.get("/editor/files");
      setTree(data.tree || []);
    } catch { toast.error("تعذّر تحميل الملفات"); }
    finally { setTL(false); }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const openFile = async (path) => {
    setFL(true); setFilePath(path); setTab("editor");
    try {
      const { data } = await api.get("/editor/file", { params: { path } });
      setCode(data.content); setOrig(data.content);
    } catch { toast.error("تعذّر فتح الملف"); setFilePath(null); }
    finally { setFL(false); }
  };

  const saveFile = async () => {
    if (!filePath) return;
    setSaving(true);
    try {
      await api.post("/editor/file", { path: filePath, content: code });
      setOrig(code);
      toast.success("✅ تم الحفظ بنجاح");
    } catch (e) { toast.error(e.response?.data?.detail || "فشل الحفظ"); }
    finally { setSaving(false); }
  };

  const revert = () => { setCode(origCode); toast.info("تم إلغاء التغييرات"); };
  const hasChanges = code !== origCode;

  /* ── Terminal ── */
  const runCommand = async (cmd) => {
    const c = (cmd || termInput).trim();
    if (!c || termRunning) return;
    setTermInput("");
    setCmdHistory(prev => [c, ...prev.slice(0, 49)]);
    setCmdIdx(-1);
    setTermHistory(prev => [...prev, { type: "cmd", text: `$ ${c}` }]);
    setTermRunning(true);
    try {
      if (c === "clear" || c === "cls") {
        setTermHistory([{ type: "info", text: "🔐 ترمنال المصمم السري" }]);
        setTermRunning(false);
        return;
      }
      const { data } = await api.post("/editor/terminal", { command: c });
      setTermHistory(prev => [...prev, {
        type: data.exit_code === 0 ? "out" : "err",
        text: data.output
      }]);
    } catch (e) {
      setTermHistory(prev => [...prev, { type: "err", text: "❌ " + (e.response?.data?.detail || "خطأ في الاتصال") }]);
    } finally { setTermRunning(false); }
  };

  const handleTermKey = (e) => {
    if (e.key === "Enter") { e.preventDefault(); runCommand(); }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(cmdIdx + 1, cmdHistory.length - 1);
      setCmdIdx(idx);
      setTermInput(cmdHistory[idx] || "");
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = Math.max(cmdIdx - 1, -1);
      setCmdIdx(idx);
      setTermInput(idx === -1 ? "" : cmdHistory[idx] || "");
    }
  };

  /* ── AI ── */
  const sendAi = async () => {
    const msg = aiInput.trim();
    if (!msg || aiLoading) return;
    setAiInput("");
    setMsgs(prev => [...prev, { role: "user", content: msg }]);
    setAiL(true);
    try {
      const { data } = await api.post("/editor/ai", {
        message: msg,
        file_path: filePath,
        file_content: code || undefined,
      });
      const aiMsg = { role: "ai", content: data.reply };
      if (data.new_content && data.new_content !== code) {
        setCode(data.new_content);
        if (!filePath) setTab("editor");
        aiMsg.applied = true;
        toast.success("طبّق الذكاء الاصطناعي التغيير — اضغط حفظ لتثبيته");
      }
      if (data.new_file) {
        toast.info(`أنشأ الذكاء الاصطناعي ملفاً جديداً: ${data.new_file.path}`);
        loadTree();
      }
      setMsgs(prev => [...prev, aiMsg]);
    } catch (e) {
      setMsgs(prev => [...prev, { role: "ai", content: "❌ " + (e.response?.data?.detail || "حدث خطأ") }]);
    } finally { setAiL(false); }
  };

  /* ── Render ── */
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[9999] flex flex-col bg-[#0a0a12] text-foreground"
        dir="rtl"
      >
        {/* ══ Header ══ */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 bg-black/50 backdrop-blur-sm shrink-0">
          {/* Logo / title */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">لوحة المصمم السرية</p>
              <p className="text-[10px] text-muted-foreground leading-tight" dir="ltr">Designer Panel · 🔐 Secret Mode</p>
            </div>
          </div>

          {/* Active file badge */}
          {filePath && (
            <div className="flex items-center gap-2 mx-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 max-w-xs min-w-0">
              <FileCode className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
                {filePath.split("/").slice(-2).join("/")}
              </span>
              {hasChanges && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-pulse" title="تغييرات غير محفوظة" />}
            </div>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 mr-2">
            {[
              { id: "editor", label: "المحرر", icon: FileCode },
              { id: "terminal", label: "ترمنال", icon: Terminal },
              { id: "ai", label: "الذكاء الاصطناعي", icon: Bot },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t.id ? "gradient-primary text-white shadow" : "text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="mr-auto flex items-center gap-2">
            {tab === "editor" && filePath && (
              <>
                <button onClick={revert} disabled={!hasChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-white/10 hover:border-white/20 transition-all disabled:opacity-30">
                  <RotateCcw className="h-3.5 w-3.5" /> تراجع
                </button>
                <button onClick={saveFile} disabled={saving || !hasChanges}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs gradient-primary text-white font-bold disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  حفظ
                </button>
              </>
            )}
            {tab === "terminal" && (
              <button onClick={() => setTermHistory([{ type: "info", text: "🔐 ترمنال المصمم السري" }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-white/10 transition-all">
                <Trash2 className="h-3.5 w-3.5" /> مسح
              </button>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/15 transition-colors"
              title="إغلاق (Esc)">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ══ Body ══ */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar (File Tree) — always visible ── */}
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="shrink-0 flex flex-col border-l border-white/8 bg-black/25 overflow-hidden"
                style={{ minWidth: sidebarOpen ? 200 : 0 }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 shrink-0">
                  <span className="text-[11px] font-bold text-muted-foreground">📁 الملفات</span>
                  <button onClick={loadTree} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                    <RefreshCw className={`h-3 w-3 ${treeLoading ? "animate-spin" : ""}`} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto py-1 px-1 scrollbar-thin">
                  {treeLoading
                    ? <div className="text-center text-muted-foreground text-[11px] py-8 flex flex-col items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> جارٍ التحميل...
                      </div>
                    : tree.map(node => (
                        <FileNode key={node.path} node={node} depth={0}
                          selectedPath={filePath} onSelect={openFile} />
                      ))
                  }
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sidebar toggle */}
          <button onClick={() => setSidebarOpen(o => !o)}
            className="shrink-0 w-5 flex items-center justify-center border-l border-white/8 bg-black/20 hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
            title={sidebarOpen ? "إخفاء الشجرة" : "إظهار الشجرة"}>
            {sidebarOpen ? <ChevronRight className="h-3 w-3" /> : <ChevronRight className="h-3 w-3 rotate-180" />}
          </button>

          {/* ══ Main Content ══ */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* ── Tab: Editor ── */}
            {tab === "editor" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {fileLoading
                  ? <div className="flex-1 flex items-center justify-center text-muted-foreground gap-3">
                      <Loader2 className="h-5 w-5 animate-spin" /> جارٍ تحميل الملف...
                    </div>
                  : filePath
                    ? <CodeTextarea value={code} onChange={setCode} />
                    : <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                        <FolderOpen className="h-16 w-16 opacity-10" />
                        <p className="text-sm font-medium">اختر ملفاً من الشجرة الجانبية</p>
                        <p className="text-xs opacity-60">أو انتقل لتبويب الذكاء الاصطناعي لطلب تعديل مباشر</p>
                        <div className="flex gap-2 mt-2 flex-wrap justify-center">
                          {["اعرض لي ملف App.js", "عدّل ألوان الموقع", "أنشئ صفحة جديدة"].map(s => (
                            <button key={s} onClick={() => { setTab("ai"); setAiInput(s); }}
                              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-primary/40 text-muted-foreground hover:text-primary transition-all">
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                }
              </div>
            )}

            {/* ── Tab: Terminal ── */}
            {tab === "terminal" && (
              <div className="flex-1 flex flex-col bg-[#050508] font-mono overflow-hidden" dir="ltr">
                {/* Output */}
                <div className="flex-1 overflow-y-auto p-4 space-y-1 text-[12px] leading-relaxed scrollbar-thin">
                  {termHistory.map((line, i) => (
                    <div key={i} className={
                      line.type === "cmd" ? "text-cyan-300 font-bold" :
                      line.type === "err" ? "text-red-400" :
                      line.type === "info" ? "text-violet-400" :
                      "text-green-300/90"
                    }>
                      {line.text.split("\n").map((l, j) => <div key={j}>{l || " "}</div>)}
                    </div>
                  ))}
                  {termRunning && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ التنفيذ...
                    </div>
                  )}
                  <div ref={termEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 border-t border-white/8 px-4 py-3 flex items-center gap-2 bg-black/40">
                  <span className="text-cyan-400 font-bold text-sm shrink-0">$</span>
                  <input
                    value={termInput}
                    onChange={e => setTermInput(e.target.value)}
                    onKeyDown={handleTermKey}
                    placeholder="اكتب أمر shell... (مثال: ls, pwd, cat backend/server.py)"
                    disabled={termRunning}
                    className="flex-1 bg-transparent text-sm text-green-300 placeholder:text-muted-foreground/40 outline-none font-mono"
                    autoFocus={tab === "terminal"}
                    ref={termInputRef}
                    dir="ltr"
                  />
                  <button onClick={() => runCommand()} disabled={!termInput.trim() || termRunning}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-white text-xs font-bold disabled:opacity-40 transition-all">
                    {termRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    تشغيل
                  </button>
                </div>

                {/* Quick commands */}
                <div className="shrink-0 px-4 pb-3 flex gap-1.5 flex-wrap border-t border-white/5 pt-2 bg-black/40">
                  {[
                    "ls", "ls frontend/src/pages", "ls backend",
                    "pwd", "cat backend/server.py | head -50",
                    "pip list | grep fast", "python --version",
                  ].map(cmd => (
                    <button key={cmd} onClick={() => runCommand(cmd)}
                      className="text-[10px] px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors font-mono border border-white/5">
                      {cmd}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tab: AI ── */}
            {tab === "ai" && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                  {msgs.map((m, i) => <AiMsg key={i} m={m} />)}
                  {aiLoading && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                        <Bot className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                        {[0, 1, 2].map(i => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Context badge */}
                {filePath && (
                  <div className="shrink-0 px-4 py-1.5 flex items-center gap-2 bg-white/3 border-t border-white/5">
                    <FileCode className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="text-[10px] text-muted-foreground font-mono truncate" dir="ltr">
                      سياق: {filePath.split("/").slice(-2).join("/")}
                    </span>
                    {hasChanges && (
                      <button onClick={saveFile} disabled={saving}
                        className="mr-auto text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors">
                        {saving ? "جارٍ الحفظ..." : "💾 حفظ التغييرات"}
                      </button>
                    )}
                  </div>
                )}

                {/* Quick prompts */}
                <div className="shrink-0 px-4 py-2 flex gap-1.5 flex-wrap border-t border-white/5">
                  {[
                    "حلّل الكود وأخبرني بالأخطاء",
                    "غيّر ألوان الموقع للأزرق",
                    "أنشئ صفحة جديدة",
                    "أضف ميزة جديدة",
                    "حسّن أداء الكود",
                  ].map(s => (
                    <button key={s} onClick={() => setAiInput(s)}
                      className="text-[10px] px-2.5 py-1 rounded-lg border border-white/8 hover:border-primary/30 text-muted-foreground hover:text-primary transition-all bg-white/3">
                      {s}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div className="shrink-0 p-4 border-t border-white/8 flex gap-2">
                  <textarea
                    ref={aiInputRef}
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAi(); } }}
                    placeholder="اطلب أي تعديل على الموقع... (Enter للإرسال، Shift+Enter لسطر جديد)"
                    disabled={aiLoading}
                    rows={2}
                    className="flex-1 text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2 resize-none outline-none focus:border-primary/40 transition-colors placeholder:text-muted-foreground/50"
                    dir="rtl"
                  />
                  <button onClick={sendAi} disabled={aiLoading || !aiInput.trim()}
                    className="shrink-0 w-10 h-full min-h-[52px] flex items-center justify-center rounded-xl gradient-primary text-white disabled:opacity-40 transition-all">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
