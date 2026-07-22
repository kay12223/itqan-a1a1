/**
 * AI Code Editor — Secret Manager Tool
 * Full access to all project files + AI that can read, write, analyze and suggest improvements
 * Supports image/file uploads alongside prompts
 */
import { useState, useRef, useEffect, useCallback } from "react";
import api from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen, FileCode, Send, Save, Loader2, RefreshCw,
  ChevronRight, ChevronDown, Bot, User, Sparkles, RotateCcw,
  CheckCircle2, Copy, Image, Paperclip, X, ScanSearch,
  Terminal, Zap, FileText, Plus, Eye,
} from "lucide-react";
import { toast } from "sonner";

/* ── File tree ── */
function FileNode({ node, depth, selectedPath, onSelect }) {
  const [open, setOpen] = useState(depth < 2);
  const isDir = !!node.children;
  const isSelected = selectedPath === node.path;

  const icon = isDir ? null : (
    node.name.endsWith(".py") ? <span className="text-yellow-400 text-[9px] font-bold">PY</span> :
    node.name.endsWith(".css") ? <span className="text-blue-300 text-[9px] font-bold">CSS</span> :
    node.name.endsWith(".json") ? <span className="text-orange-400 text-[9px] font-bold">JSON</span> :
    <FileCode className="h-3 w-3 shrink-0 text-blue-400" />
  );

  return (
    <div>
      <div
        onClick={() => isDir ? setOpen(o => !o) : onSelect(node.path)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg cursor-pointer text-xs transition-colors select-none
          ${isSelected ? "bg-primary/25 text-primary font-semibold" : "hover:bg-white/8 text-muted-foreground hover:text-foreground"}`}
        style={{ paddingRight: `${8 + depth * 10}px` }}>
        {isDir
          ? (open ? <ChevronDown className="h-3 w-3 shrink-0" /> : <ChevronRight className="h-3 w-3 shrink-0" />)
          : icon}
        <span className="truncate">{node.name}</span>
      </div>
      {isDir && open && node.children?.map((child) => (
        <FileNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
}

/* ── Code editor ── */
function CodeArea({ value, onChange }) {
  const taRef = useRef(null);
  const numsRef = useRef(null);
  const lines = value.split("\n").length;

  const syncScroll = () => {
    if (numsRef.current && taRef.current)
      numsRef.current.scrollTop = taRef.current.scrollTop;
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = e.target;
      const newVal = value.slice(0, s) + "  " + value.slice(end);
      onChange(newVal);
      requestAnimationFrame(() => {
        if (taRef.current) taRef.current.selectionStart = taRef.current.selectionEnd = s + 2;
      });
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden font-mono text-xs" dir="ltr">
      <div ref={numsRef}
        className="overflow-hidden select-none shrink-0 text-right bg-white/3 border-l border-white/10 text-muted-foreground/40"
        style={{ width: 38, paddingTop: 10, overflowY: "hidden" }}>
        {Array.from({ length: lines }, (_, i) => (
          <div key={i} className="leading-6 px-1.5" style={{ height: 24 }}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onKeyDown={handleKeyDown}
        className="flex-1 bg-transparent outline-none resize-none text-foreground leading-6 p-2.5 caret-primary"
        spellCheck={false}
        style={{ fontFamily: "'JetBrains Mono','Fira Code','Consolas',monospace", lineHeight: "24px" }}
      />
    </div>
  );
}

/* ── Chat message ── */
function Msg({ m }) {
  const isUser = m.role === "user";
  const [copied, setCopied] = useState(false);
  const codeBlocks = m.content.match(/```[\s\S]*?```/g) || [];

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parts = m.content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`shrink-0 w-7 h-7 rounded-xl flex items-center justify-center mt-0.5
        ${isUser ? "gradient-primary" : "bg-purple-500/15 border border-purple-500/30"}`}>
        {isUser ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-purple-400" />}
      </div>
      <div className={`max-w-[88%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        {m.image_name && (
          <div className="flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-muted-foreground">
            <Image className="h-3 w-3" /> {m.image_name}
          </div>
        )}
        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed
          ${isUser ? "gradient-primary text-white" : "glass border border-white/10 text-foreground"}`}
          dir="rtl">
          {parts.map((part, i) => {
            if (part.startsWith("```")) {
              const code = part.replace(/```\w*\n?|\n?```/g, "");
              return (
                <div key={i} className="relative mt-2 mb-1 rounded-xl overflow-hidden border border-white/10" dir="ltr">
                  <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 text-xs text-muted-foreground">
                    <span className="font-mono">code</span>
                    <button onClick={() => copy(code)} className="hover:text-foreground transition-colors">
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <pre className="p-3 text-xs overflow-x-auto leading-5 bg-black/40 max-h-64 overflow-y-auto"
                    style={{ fontFamily: "monospace" }}>
                    {code}
                  </pre>
                </div>
              );
            }
            return <span key={i} className="whitespace-pre-wrap">{part}</span>;
          })}
        </div>
        {m.applied && (
          <span className="text-xs text-green-400 flex items-center gap-1 px-1">
            <CheckCircle2 className="h-3 w-3" /> تم تطبيق التغيير
          </span>
        )}
        {m.type === "analysis" && (
          <span className="text-xs text-blue-400 flex items-center gap-1 px-1">
            <ScanSearch className="h-3 w-3" /> تقرير تحليل الموقع
          </span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ */
export default function AICodeEditor() {
  const [tree, setTree]           = useState([]);
  const [treeLoading, setTL]      = useState(false);
  const [filePath, setFilePath]   = useState(null);
  const [code, setCode]           = useState("");
  const [origCode, setOrig]       = useState("");
  const [fileLoading, setFL]      = useState(false);
  const [saving, setSaving]       = useState(false);
  const [msgs, setMsgs]           = useState([{
    role: "ai",
    content: "مرحباً! أنا مطورك الذكي 🚀\n\nيمكنني:\n• قراءة وتعديل أي ملف في المشروع\n• تحليل الموقع بالكامل وإعطاء تقرير شامل\n• تطوير ميزات جديدة وكتابة الكود كاملاً\n• قبول صور وملفات لفهم ما تريده\n\nافتح ملفاً أو اكتب سؤالك مباشرةً!"
  }]);
  const [input, setInput]         = useState("");
  const [aiLoading, setAIL]       = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [attachedImg, setImg]     = useState(null); // {name, data (base64), preview}
  const [tab, setTab]             = useState("editor"); // editor | terminal
  const chatEndRef                = useRef(null);
  const fileRef                   = useRef(null);
  const imgRef                    = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const loadTree = useCallback(async () => {
    setTL(true);
    try {
      const { data } = await api.get("/editor/files");
      setTree(data.tree || []);
    } catch (e) {
      toast.error("تعذّر تحميل الملفات: " + (e.response?.data?.detail || e.message));
    } finally { setTL(false); }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  const openFile = async (path) => {
    setFL(true); setFilePath(path);
    try {
      const { data } = await api.get("/editor/file", { params: { path } });
      setCode(data.content); setOrig(data.content);
    } catch (e) {
      toast.error("تعذّر فتح الملف");
      setFilePath(null);
    } finally { setFL(false); }
  };

  const saveFile = async () => {
    if (!filePath) return;
    setSaving(true);
    try {
      await api.post("/editor/file", { path: filePath, content: code });
      setOrig(code);
      toast.success("تم الحفظ ✅");
    } catch (e) {
      toast.error(e.response?.data?.detail || "فشل الحفظ");
    } finally { setSaving(false); }
  };

  const revert = () => { setCode(origCode); toast.info("تم إلغاء التغييرات"); };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setImg({ name: file.name, data: base64, preview: ev.target.result });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    setMsgs(prev => [...prev, { role: "user", content: "🔍 طلب تحليل شامل للموقع..." }]);
    try {
      const { data } = await api.post("/editor/analyze");
      setMsgs(prev => [...prev, {
        role: "ai",
        content: data.report + `\n\n📊 إحصائيات:\n- ملفات الـ frontend: ${data.stats.fe_files}\n- ملفات الـ backend: ${data.stats.be_files}`,
        type: "analysis"
      }]);
    } catch (e) {
      toast.error("فشل التحليل: " + (e.response?.data?.detail || e.message));
    } finally { setAnalyzing(false); }
  };

  const sendMsg = async () => {
    const msg = input.trim();
    if ((!msg && !attachedImg) || aiLoading) return;
    setInput("");
    const userMsg = { role: "user", content: msg || "(أرسل صورة)", image_name: attachedImg?.name };
    setMsgs(prev => [...prev, userMsg]);
    const imgToSend = attachedImg;
    setImg(null);
    setAIL(true);
    try {
      const { data } = await api.post("/editor/ai", {
        message: msg,
        file_path: filePath,
        file_content: code || undefined,
        image_data: imgToSend?.data,
        image_name: imgToSend?.name,
      });
      const aiMsg = { role: "ai", content: data.reply };
      if (data.new_content && data.new_content !== code) {
        setCode(data.new_content);
        aiMsg.applied = true;
        toast.success("🤖 طبّق الذكاء الاصطناعي التغيير", { description: "اضغط حفظ لتثبيت التعديل" });
      }
      if (data.new_file) {
        toast.info(`📄 الذكاء اقترح إنشاء ملف: ${data.new_file.path}`);
      }
      setMsgs(prev => [...prev, aiMsg]);
    } catch (e) {
      setMsgs(prev => [...prev, { role: "ai", content: "❌ " + (e.response?.data?.detail || "حدث خطأ في الاتصال") }]);
    } finally { setAIL(false); }
  };

  const hasChanges = code !== origCode;

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden" dir="rtl">

      {/* ── File tree ── */}
      <div className="w-52 shrink-0 border-l border-white/10 flex flex-col bg-black/20">
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
          <span className="text-xs font-bold gradient-text">📁 الملفات</span>
          <button onClick={loadTree} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${treeLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1 px-1 text-xs">
          {treeLoading ? (
            <div className="text-center text-muted-foreground py-6">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" /> جارٍ التحميل...
            </div>
          ) : tree.map((node) => (
            <FileNode key={node.path} node={node} depth={0} selectedPath={filePath} onSelect={openFile} />
          ))}
        </div>
        {/* Quick actions */}
        <div className="border-t border-white/10 p-2 space-y-1">
          <button onClick={runAnalysis} disabled={analyzing}
            className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/10 transition-colors">
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanSearch className="h-3 w-3" />}
            تحليل الموقع
          </button>
        </div>
      </div>

      {/* ── Code editor ── */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-white/10">
        {/* Tabs */}
        <div className="flex items-center border-b border-white/10 bg-white/2">
          <button onClick={() => setTab("editor")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition-colors border-b-2 
              ${tab === "editor" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            <FileCode className="h-3.5 w-3.5" /> المحرر
          </button>
          {filePath && hasChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mx-1 mt-0.5" title="تغييرات غير محفوظة" />
          )}
          <div className="flex-1" />
          {filePath && (
            <div className="flex items-center gap-2 px-3">
              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-48" dir="ltr">
                {filePath.split("/").slice(-2).join("/")}
              </span>
              {hasChanges && <>
                <button onClick={revert} title="تراجع" className="text-muted-foreground hover:text-foreground transition-colors">
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <Button size="sm" onClick={saveFile} disabled={saving}
                  className="h-7 px-3 text-xs gradient-primary text-white">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 ml-1" /> حفظ</>}
                </Button>
              </>}
            </div>
          )}
        </div>

        {fileLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : filePath ? (
          <CodeArea value={code} onChange={setCode} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground p-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 border border-white/10">
              <FolderOpen className="h-10 w-10 opacity-30" />
            </div>
            <div className="text-center">
              <p className="font-bold mb-1">لم تُفتح أي ملف</p>
              <p className="text-xs">اختر ملفاً من الشجرة على اليسار</p>
              <p className="text-xs mt-0.5">أو تحدث مع الذكاء الاصطناعي مباشرةً بدون ملف</p>
            </div>
            <button onClick={runAnalysis} disabled={analyzing}
              className="flex items-center gap-2 rounded-xl border border-purple-500/30 px-4 py-2.5 text-sm font-bold text-purple-400 hover:bg-purple-500/10 transition-colors">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
              تحليل الموقع كاملاً
            </button>
          </div>
        )}
      </div>

      {/* ── AI Chat panel ── */}
      <div className="w-96 shrink-0 flex flex-col border-r border-white/10 bg-black/20">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30">
            <Sparkles className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="font-bold text-sm gradient-text">المطور الذكي</p>
            <p className="text-[10px] text-muted-foreground">وصول كامل لجميع ملفات المشروع</p>
          </div>
          <div className="mr-auto flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400">متصل</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgs.map((m, i) => <Msg key={i} m={m} />)}
          {aiLoading && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-purple-400" />
              </div>
              <div className="glass border border-white/10 rounded-2xl px-4 py-2.5">
                <div className="flex gap-1 items-center">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                  <span className="text-xs text-muted-foreground mr-2">جارٍ التفكير...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Attached image preview */}
        {attachedImg && (
          <div className="mx-3 mb-1 flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
            <img src={attachedImg.preview} alt="" className="h-10 w-10 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{attachedImg.name}</p>
              <p className="text-[10px] text-muted-foreground">صورة مرفقة</p>
            </div>
            <button onClick={() => setImg(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Quick actions */}
        <div className="px-3 pb-1 flex gap-1.5 flex-wrap">
          <button onClick={() => setInput("حلل هذا الملف وأخبرني بنقاط التحسين")}
            className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
            تحليل الملف
          </button>
          <button onClick={() => setInput("أضف تحسينات على الأداء والسرعة")}
            className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
            تحسين الأداء
          </button>
          <button onClick={() => setInput("كيف يعمل هذا الكود؟ اشرح لي")}
            className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
            اشرح الكود
          </button>
          <button onClick={() => setInput("أصلح أي أخطاء أو مشاكل في هذا الملف")}
            className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
            إصلاح الأخطاء
          </button>
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2">
            {/* Image upload */}
            <button onClick={() => imgRef.current?.click()}
              className="shrink-0 flex items-center justify-center h-9 w-9 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-muted-foreground hover:text-foreground">
              <Image className="h-4 w-4" />
            </button>
            <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); } }}
              placeholder="اكتب طلبك أو أرسل صورة..."
              disabled={aiLoading}
              className="flex-1 text-sm bg-transparent border-white/10 h-9"
              dir="rtl"
            />
            <Button onClick={sendMsg} disabled={aiLoading || (!input.trim() && !attachedImg)} size="icon"
              className="shrink-0 h-9 w-9 gradient-primary text-white">
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
            Enter للإرسال • يمكنك إرسال صور وملفات
          </p>
        </div>
      </div>
    </div>
  );
}
