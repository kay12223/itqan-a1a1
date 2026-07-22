import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3, X, RotateCcw, EyeOff, Bold, Italic, Underline,
  AlignRight, AlignCenter, AlignLeft, Trash2, Plus, Minus,
  Palette, Wand2, Sparkles, Layers, Lock, PaintBucket, Type,
  Bot, Send, Loader2, MousePointer2, Pen, Scissors, Pipette,
  ZoomIn, ZoomOut, Move, Highlighter, Square, Circle, Minus as Line,
  Undo2, Redo2, Download, Grid, Ruler, FlipHorizontal, RotateCw,
  Maximize2, SlidersHorizontal, Paintbrush, Star, Triangle,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Copy, Eye,
  Eraser, Hand, Camera, ImagePlus, Type as TextCursor, ArrowRight,
} from "lucide-react";
import { useEditMode } from "@/context/EditModeContext";
import { toast } from "sonner";

// ─── Constants ─────────────────────────────────────────────────
const PRESET_COLORS = [
  "#ffffff","#000000","#6366f1","#22d3ee","#f59e0b","#ef4444",
  "#10b981","#8b5cf6","#f97316","#ec4899","#14b8a6","#84cc16",
  "#06b6d4","#a855f7","#f43f5e","#0ea5e9","#64748b","#dc2626",
  "#16a34a","#ca8a04",
];

const GOOGLE_FONTS = [
  { name: "Cairo", css: "'Cairo', sans-serif" },
  { name: "Tajawal", css: "'Tajawal', sans-serif" },
  { name: "Alexandria", css: "'Alexandria', sans-serif" },
  { name: "Almarai", css: "'Almarai', sans-serif" },
  { name: "Noto Sans Arabic", css: "'Noto Sans Arabic', sans-serif" },
  { name: "IBM Plex Sans Arabic", css: "'IBM Plex Sans Arabic', sans-serif" },
  { name: "Readex Pro", css: "'Readex Pro', sans-serif" },
  { name: "Baloo Bhaijaan 2", css: "'Baloo Bhaijaan 2', sans-serif" },
];

const BORDER_STYLES = ["none","solid","dashed","dotted","double","groove","ridge","inset","outset"];

const BLEND_MODES = ["normal","multiply","screen","overlay","darken","lighten","color-dodge","color-burn","difference","exclusion","hue","saturation","color","luminosity"];

// ─── Utilities ─────────────────────────────────────────────────
function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (["script","style","html","body","head","input","textarea","select","button","a","svg","path","img"].includes(tag)) return false;
  if (el.contentEditable === "true") return false;
  if (el.hasAttribute("data-no-edit")) return false;
  return true;
}

function getElementKey(el) {
  if (el.dataset?.eid) return el.dataset.eid;
  let path = [];
  let e = el;
  let depth = 0;
  while (e && e !== document.body && depth < 6) {
    const siblings = e.parentElement ? [...e.parentElement.children] : [];
    const idx = siblings.indexOf(e);
    const text = e.textContent?.trim().slice(0, 20).replace(/\s+/g, "_") || "";
    path.unshift(`${e.tagName.toLowerCase()}[${idx}]_${text}`);
    e = e.parentElement;
    depth++;
  }
  return "dom__" + path.join(">");
}

function hexToHsl(hex) {
  let r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) { case r: h=(g-b)/d+(g<b?6:0); break; case g: h=(b-r)/d+2; break; case b: h=(r-g)/d+4; break; }
    h /= 6;
  }
  return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`;
}

// ─── History Stack ─────────────────────────────────────────────
const history = { stack: [], cursor: -1 };
function pushHistory(action) {
  history.stack = history.stack.slice(0, history.cursor + 1);
  history.stack.push(action);
  history.cursor = history.stack.length - 1;
}

// ─── AI Command Engine ─────────────────────────────────────────
function applyAICommand(cmd) {
  const lower = cmd.toLowerCase().trim();
  const colorMap = {
    أحمر:"0 84% 60%", أزرق:"217 91% 60%", أخضر:"160 84% 39%", بنفسجي:"258 90% 66%",
    ذهبي:"38 92% 50%", زهري:"315 80% 65%", برتقالي:"25 95% 55%", سماوي:"188 94% 43%",
    رمادي:"220 9% 46%", أبيض:"0 0% 100%", أسود:"0 0% 5%", بيج:"34 57% 70%",
    red:"0 84% 60%", blue:"217 91% 60%", green:"160 84% 39%", purple:"258 90% 66%",
    gold:"38 92% 50%", pink:"315 80% 65%", orange:"25 95% 55%", cyan:"188 94% 43%",
  };
  // Primary color
  const colorMatch = lower.match(/(?:غيّر|غير|حوّل|حول|اجعل)\s+(?:الخلفية|اللون الأساسي|primary|البرايمري)\s+(?:إلى|الى|ل)?\s*(\w+)/);
  if (colorMatch || lower.includes("primary") || lower.includes("أساسي") || lower.includes("برايمري")) {
    for (const [name, hsl] of Object.entries(colorMap)) {
      if (lower.includes(name)) {
        document.documentElement.style.setProperty("--primary", hsl);
        const stored = JSON.parse(localStorage.getItem("itqan_design_settings") || "{}");
        stored.primary = hsl; localStorage.setItem("itqan_design_settings", JSON.stringify(stored));
        return `✅ تم تغيير اللون الأساسي إلى ${name}`;
      }
    }
  }
  // Secondary color
  if (lower.includes("ثانوي") || lower.includes("secondary")) {
    for (const [name, hsl] of Object.entries(colorMap)) {
      if (lower.includes(name)) {
        document.documentElement.style.setProperty("--secondary", hsl);
        return `✅ تم تغيير اللون الثانوي إلى ${name}`;
      }
    }
  }
  // Font
  if (lower.includes("خط") || lower.includes("font")) {
    for (const f of GOOGLE_FONTS) {
      if (lower.includes(f.name.toLowerCase())) {
        document.body.style.fontFamily = f.css;
        return `✅ تم تغيير الخط إلى ${f.name}`;
      }
    }
  }
  // Theme
  if (lower.includes("مظلم") || lower.includes("dark") || lower.includes("ليلي")) {
    document.documentElement.setAttribute("data-theme","void");
    return "✅ تم التبديل للوضع المظلم";
  }
  if (lower.includes("مضيء") || lower.includes("فاتح") || lower.includes("light")) {
    document.documentElement.setAttribute("data-theme","clouds");
    return "✅ تم التبديل للوضع المضيء";
  }
  // Radius
  if (lower.includes("زاوية") || lower.includes("radius") || lower.includes("دائري")) {
    const v = lower.includes("كامل")||lower.includes("full") ? "9999px" : lower.includes("حاد")||lower.includes("sharp") ? "0" : "1rem";
    document.documentElement.style.setProperty("--radius", v);
    return `✅ تم تغيير الزوايا`;
  }
  // Opacity / transparency
  if (lower.includes("شفافية") || lower.includes("opacity") || lower.includes("شفاف")) {
    const numMatch = lower.match(/(\d+)/);
    const val = numMatch ? Math.min(100, parseInt(numMatch[1])) : 80;
    document.body.style.opacity = (val/100).toString();
    return `✅ تم ضبط الشفافية على ${val}%`;
  }
  // Background color
  if (lower.includes("خلفية") || lower.includes("background")) {
    for (const [name, hsl] of Object.entries(colorMap)) {
      if (lower.includes(name)) {
        document.documentElement.style.setProperty("--background", hsl);
        return `✅ تم تغيير لون الخلفية إلى ${name}`;
      }
    }
  }
  // Find & Replace text
  const replaceMatch = cmd.match(/(?:غيّر|غير|بدّل|بدل)\s+(?:كلمة\s+|نص\s+)?["«"](.+?)["»"]\s+(?:إلى|ب|الى)\s+["«"](.+?)["»"]/);
  if (replaceMatch) {
    const [, oldText, newText] = replaceMatch;
    let found = false;
    const walk = (node) => {
      if (node.nodeType === 3 && node.textContent.includes(oldText)) { node.textContent = node.textContent.replace(oldText, newText); found = true; }
      else node.childNodes.forEach(walk);
    };
    walk(document.body);
    return found ? `✅ تم تغيير "${oldText}" إلى "${newText}"` : `❌ لم أجد "${oldText}"`;
  }
  // Hide element
  const hideMatch = cmd.match(/(?:أخفِ|اخفي|أخفي|إخفاء)\s+["«"](.+?)["»"]/);
  if (hideMatch) {
    let found = false;
    document.querySelectorAll("*").forEach((el) => {
      if (el.textContent.trim() === hideMatch[1] && el.children.length === 0) { el.style.display = "none"; found = true; }
    });
    return found ? `✅ تم إخفاء "${hideMatch[1]}"` : `❌ لم أجد "${hideMatch[1]}"`;
  }
  // Font size
  if ((lower.includes("حجم") || lower.includes("size")) && lower.match(/\d+/)) {
    const size = lower.match(/(\d+)/)?.[1];
    if (size) { document.body.style.fontSize = size + "px"; return `✅ تم تغيير حجم الخط إلى ${size}px`; }
  }
  // Grid/ruler
  if (lower.includes("شبكة") || lower.includes("grid")) {
    const overlay = document.getElementById("__editor_grid__");
    if (overlay) { overlay.remove(); return "✅ تم إخفاء الشبكة"; }
    const div = document.createElement("div");
    div.id = "__editor_grid__";
    div.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9990;background-image:linear-gradient(rgba(99,102,241,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.1) 1px,transparent 1px);background-size:20px 20px;";
    document.body.appendChild(div);
    return "✅ تم تفعيل شبكة التصميم";
  }
  return null;
}

// ─── Confirm Dialog ─────────────────────────────────────────────
function ConfirmDialog({ open, title, message, icon: Icon, danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md" data-editor-ui style={{ direction: "rtl" }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
        className="w-80 overflow-hidden rounded-3xl border shadow-2xl"
        style={{ background: "rgba(10,10,20,0.98)", borderColor: danger ? "rgba(239,68,68,0.4)" : "rgba(139,92,246,0.4)" }}>
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${danger ? "bg-red-500/20 text-red-400" : "bg-violet-500/20 text-violet-400"}`}>
            {Icon ? <Icon className="h-7 w-7" /> : <AlertTriangle className="h-7 w-7" />}
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">{title}</p>
            <p className="mt-1 text-sm text-white/50">{message}</p>
          </div>
          <div className="flex w-full gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 rounded-2xl border border-white/10 py-2.5 text-sm font-bold text-white/60 hover:bg-white/10 transition">إلغاء</button>
            <button onClick={onConfirm}
              className={`flex-1 rounded-2xl py-2.5 text-sm font-bold text-white transition ${danger ? "bg-red-500/80 hover:bg-red-500" : "bg-gradient-to-r from-violet-600 to-cyan-500 hover:opacity-90"}`}>
              تأكيد
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Full Color Picker ─────────────────────────────────────────
function ColorPicker({ value, onChange, label }) {
  const [hex, setHex] = useState(value || "#6366f1");
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("itqan_recent_colors") || "[]"); } catch { return []; }
  });
  const pick = (color) => {
    setHex(color);
    onChange(color);
    const r = [color, ...recent.filter((c) => c !== color)].slice(0, 10);
    setRecent(r);
    localStorage.setItem("itqan_recent_colors", JSON.stringify(r));
  };
  return (
    <div className="space-y-2">
      {label && <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>}
      <div className="grid grid-cols-10 gap-1">
        {PRESET_COLORS.map((c) => (
          <button key={c} onClick={() => pick(c)} title={c}
            className={`h-5 w-5 rounded-md border-2 transition hover:scale-125 ${hex === c ? "border-white scale-110" : "border-white/10"}`}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      {recent.length > 0 && (
        <div>
          <p className="mb-1 text-[8px] text-white/20 uppercase tracking-widest">مستخدمة مؤخراً</p>
          <div className="flex gap-1 flex-wrap">
            {recent.map((c) => (
              <button key={c} onClick={() => pick(c)} className="h-4 w-4 rounded border border-white/20 hover:scale-110 transition" style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      )}
      <label className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg border border-white/20 overflow-hidden">
          <div className="w-full h-full" style={{ backgroundColor: hex }} />
        </div>
        <div className="relative flex-1">
          <input type="color" value={hex} onChange={(e) => pick(e.target.value)} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          <input type="text" value={hex} onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) pick(e.target.value); }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-white outline-none focus:border-violet-500/50"
            placeholder="#000000" />
        </div>
      </label>
    </div>
  );
}

// ─── Shadow Builder ─────────────────────────────────────────────
function FilterSlider({ label, prop, min, max, def, unit, applyStyle }) {
  const [val, setVal] = useState(def);
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-20 shrink-0 text-[9px] text-white/40">{label}</span>
      <input type="range" min={min} max={max} value={val}
        onChange={(e) => { setVal(Number(e.target.value)); applyStyle("filter", `${prop}(${e.target.value}${unit})`); }}
        className="flex-1 accent-violet-500" />
      <span className="w-8 text-right text-[9px] text-white/40">{val}{unit}</span>
    </div>
  );
}

function ShadowBuilder({ onApply }) {
  const [x, setX] = useState(0); const [y, setY] = useState(4);
  const [blur, setBlur] = useState(12); const [spread, setSpread] = useState(0);
  const [color, setColor] = useState("#000000"); const [opacity, setOpacity] = useState(50);
  const [inset, setInset] = useState(false);
  const preview = `${inset?"inset ":""}${x}px ${y}px ${blur}px ${spread}px ${color}${Math.round(opacity*2.55).toString(16).padStart(2,"0")}`;
  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30">ظل مخصص</p>
      {[
        { label: "X", val: x, set: setX, min: -50, max: 50 },
        { label: "Y", val: y, set: setY, min: -50, max: 50 },
        { label: "ضبابية", val: blur, set: setBlur, min: 0, max: 100 },
        { label: "انتشار", val: spread, set: setSpread, min: -20, max: 40 },
        { label: "شفافية", val: opacity, set: setOpacity, min: 0, max: 100 },
      ].map(({ label, val, set, min, max }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-14 text-[10px] text-white/40">{label}</span>
          <input type="range" min={min} max={max} value={val} onChange={(e) => set(Number(e.target.value))}
            className="flex-1 accent-violet-500" />
          <span className="w-6 text-right text-[10px] text-white/60">{val}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent" />
        <button onClick={() => setInset((v) => !v)}
          className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${inset ? "bg-violet-600 text-white" : "border border-white/10 text-white/50"}`}>
          داخلي
        </button>
        <button onClick={() => onApply("boxShadow", preview)}
          className="ms-auto rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-1 text-[10px] font-bold text-white hover:opacity-90">
          تطبيق
        </button>
      </div>
    </div>
  );
}

// ─── Image Insert Modal ─────────────────────────────────────────
function ImageInsertModal({ position, onClose }) {
  const [url, setUrl] = useState("");
  const [tab, setTab] = useState("url");
  const [preview, setPreview] = useState("");
  const fileRef = useRef(null);

  const insertImage = (src) => {
    if (!src) return;
    const img = document.createElement("img");
    img.src = src;
    img.setAttribute("data-editor-overlay", "true");
    img.style.cssText = `position:fixed;left:${Math.max(10, position.x - 100)}px;top:${Math.max(80, position.y - 60)}px;z-index:9980;max-width:320px;max-height:320px;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5);cursor:move;user-select:none;outline:2px solid rgba(99,102,241,0.6);`;
    img.title = "اسحب لتحريك الصورة — انقر مرتين لحذفها";
    img.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const rect = img.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      const onMove = (ev) => { img.style.left = (ev.clientX - offX) + "px"; img.style.top = (ev.clientY - offY) + "px"; };
      const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    img.addEventListener("dblclick", () => { if (window.confirm("حذف هذه الصورة؟")) img.remove(); });
    document.body.appendChild(img);
    toast.success("✅ تم إدراج الصورة — اسحبها للتحريك");
    onClose();
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPreview(ev.target.result); setUrl(ev.target.result); setTab("url"); };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-md" data-editor-ui style={{ direction:"rtl" }}>
      <motion.div initial={{ scale:0.85, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.85, opacity:0 }}
        className="w-[340px] overflow-hidden rounded-3xl border shadow-2xl"
        style={{ background:"rgba(8,8,20,0.98)", borderColor:"rgba(139,92,246,0.5)" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ background:"linear-gradient(135deg,rgba(109,40,217,0.7),rgba(6,182,212,0.4))", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-white" />
            <span className="text-sm font-bold text-white">إدراج صورة</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white transition"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-1 rounded-xl bg-white/5 p-1">
            {[{id:"url",label:"رابط URL"},{id:"upload",label:"رفع صورة"}].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${tab===t.id ? "bg-violet-600 text-white" : "text-white/50 hover:text-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === "url" ? (
            <div className="space-y-2">
              <input value={url} onChange={(e) => { setUrl(e.target.value); setPreview(e.target.value); }}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-500/50 text-left"
                dir="ltr" onKeyDown={(e) => e.key === "Enter" && insertImage(url)} />
              {preview && (
                <div className="relative overflow-hidden rounded-xl border border-white/10" style={{ height:120 }}>
                  <img src={preview} alt="" className="w-full h-full object-contain" onError={() => setPreview("")} />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <button onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-violet-500/40 py-7 text-center hover:border-violet-500/70 hover:bg-violet-500/5 transition cursor-pointer">
                <ImagePlus className="mx-auto mb-2 h-8 w-8 text-violet-400/60" />
                <p className="text-xs text-white/40">اضغط لاختيار صورة من جهازك</p>
                <p className="text-[10px] text-white/20 mt-1">PNG, JPG, WebP, GIF</p>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => insertImage(url)} disabled={!url.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2.5 text-sm font-bold text-white disabled:opacity-40 hover:opacity-90 transition">
              إدراج الصورة
            </button>
            <button onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/40 hover:bg-white/10 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[9px] text-white/25 text-center">بعد الإدراج: اسحب الصورة للتحريك | انقر مرتين لحذفها</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Drawing Canvas ─────────────────────────────────────────────
function DrawingCanvas({ tool, color, size, onClose }) {
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches?.[0] || e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  const startDraw = (e) => {
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === "eraser" ? "rgba(0,0,0,1)" : color;
    ctx.fill();
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (tool === "highlighter") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color + "80";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    }
    ctx.lineWidth = size;
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => { isDrawing.current = false; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveAnnotation = () => {
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.download = "itqan-annotation.png";
    a.href = url;
    a.click();
  };

  return (
    <canvas
      ref={canvasRef}
      data-editor-ui
      style={{ position: "fixed", inset: 0, zIndex: 9993, cursor: tool === "eraser" ? "cell" : "crosshair", touchAction: "none" }}
      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
      onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
    />
  );
}

// ─── AI Panel (Enhanced - 4 tabs) ─────────────────────────────
function AIPanel({ onClose }) {
  const { saveGlobalCSSVars, saveGlobalCustomCSS, saveGlobalTexts,
          readSourceFile, writeSourceFile, listSourceFiles,
          aiCodeEdit, setSiteNotice, uploadAsset } = useEditMode();

  const [tab, setTab] = useState("design");

  // Design tab
  const [designMsgs, setDesignMsgs] = useState([{
    role: "ai",
    text: "🎨 أوامر التصميم العالمية:\n• «غيّر اللون الأساسي إلى أحمر» ← يطبّق على الكل\n• «غيّر خط Tajawal»\n• «اجعل الوضع مظلم»\n• «غيّر «نص قديم» إلى «نص جديد»»\n• «اجعل الزوايا دائرية»\n• «فعّل شبكة التصميم»"
  }]);
  const [designInput, setDesignInput] = useState("");
  const [designLoading, setDesignLoading] = useState(false);

  // Code tab
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [codePromptInput, setCodePromptInput] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeMsg, setCodeMsg] = useState("");
  const [showDiff, setShowDiff] = useState(false);

  // Notice tab
  const [noticeMsg, setNoticeMsg] = useState("");
  const [noticeType, setNoticeType] = useState("info");
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [noticeResult, setNoticeResult] = useState("");

  // Media tab
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);

  const bottomRef = useRef(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [designMsgs]);

  // Load file list when code tab opened
  useEffect(() => {
    if (tab === "code" && files.length === 0) {
      listSourceFiles().then(setFiles).catch(() => {});
    }
  }, [tab, files.length, listSourceFiles]);

  // ── Design send ──
  const sendDesign = async () => {
    const text = designInput.trim();
    if (!text) return;
    setDesignInput(""); setDesignLoading(true);
    setDesignMsgs((m) => [...m, { role: "user", text }]);
    const result = applyAICommand(text);
    if (result?.startsWith("✅")) {
      const cssVars = {};
      const root = document.documentElement;
      ["--primary","--accent","--glow","--radius","--background","--secondary"].forEach(v => {
        const val = root.style.getPropertyValue(v);
        if (val) cssVars[v] = val;
      });
      if (Object.keys(cssVars).length > 0) {
        saveGlobalCSSVars(cssVars).then((r) => {
          setDesignMsgs((m) => [...m, { role: "ai", text: result + "\n🌐 " + r.msg }]);
          setDesignLoading(false);
        });
      } else {
        setTimeout(() => {
          setDesignMsgs((m) => [...m, { role: "ai", text: result }]);
          setDesignLoading(false);
          toast.success(result.replace("✅ ", ""));
        }, 300);
      }
    } else {
      setTimeout(() => {
        setDesignMsgs((m) => [...m, { role: "ai", text: result || "💡 لم أفهم الأمر. جرب: «غيّر اللون الأساسي إلى أزرق»" }]);
        setDesignLoading(false);
      }, 300);
    }
  };

  // ── Code tab: load file ──
  const loadFile = async (path) => {
    if (!path) return;
    setSelectedFile(path); setFileContent(""); setGeneratedCode(""); setShowDiff(false);
    try {
      const r = await readSourceFile(path);
      setFileContent(r.content);
      setCodeMsg(`✅ تم تحميل ${path} (${r.lines} سطر)`);
    } catch (e) {
      setCodeMsg("❌ فشل تحميل الملف");
    }
  };

  const generateCode = async () => {
    if (!codePromptInput.trim()) return;
    setCodeLoading(true); setGeneratedCode(""); setShowDiff(false);
    try {
      const r = await aiCodeEdit(codePromptInput, selectedFile, fileContent);
      setGeneratedCode(r.code);
      setShowDiff(true);
      setCodeMsg("✅ تم توليد الكود — راجع التعديلات وطبّقها");
    } catch (e) {
      setCodeMsg("❌ فشل توليد الكود");
    } finally {
      setCodeLoading(false);
    }
  };

  const applyCode = async () => {
    if (!selectedFile || !generatedCode) return;
    setCodeLoading(true);
    try {
      const r = await writeSourceFile(selectedFile, generatedCode);
      setFileContent(generatedCode);
      setGeneratedCode(""); setShowDiff(false);
      setCodeMsg("✅ " + r.message + " — الموقع يُحدَّث تلقائياً");
      toast.success("تم تطبيق التعديل على الكود!");
    } catch (e) {
      setCodeMsg("❌ فشل حفظ الملف");
    } finally {
      setCodeLoading(false);
    }
  };

  // ── Notice tab ──
  const publishNotice = async (active) => {
    if (!noticeMsg.trim() && active) return;
    setNoticeSaving(true);
    try {
      const r = await setSiteNotice(noticeMsg, noticeType, active);
      setNoticeResult(active ? "✅ الإشعار مرئي لجميع المستخدمين الآن!" : "✅ تم إخفاء الإشعار");
      toast.success(r.message || "تم!");
    } catch { setNoticeResult("❌ فشل"); }
    finally { setNoticeSaving(false); }
  };

  // ── Media tab ──
  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadFile(f); setUploadedUrl("");
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setUploadPreview(ev.target?.result || "");
      reader.readAsDataURL(f);
    } else { setUploadPreview(""); }
  };

  const doUpload = async () => {
    if (!uploadFile) return;
    setUploadLoading(true);
    try {
      const r = await uploadAsset(uploadFile);
      setUploadedUrl(r.url);
      toast.success("✅ تم رفع الملف!");
    } catch { toast.error("❌ فشل الرفع"); }
    finally { setUploadLoading(false); }
  };

  const TABS = [
    { id: "design", label: "تصميم", icon: Palette },
    { id: "code",   label: "كود",   icon: Wand2 },
    { id: "notice", label: "إشعار", icon: Sparkles },
    { id: "media",  label: "وسائط", icon: ImagePlus },
  ];

  return (
    <motion.div data-editor-ui initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
      style={{ position:"fixed", bottom:20, left:260, width:340, maxHeight:"80vh", zIndex:9996, direction:"rtl",
        background:"rgba(6,6,18,0.97)", border:"1px solid rgba(139,92,246,0.4)",
        borderRadius:20, overflow:"hidden", backdropFilter:"blur(24px)", boxShadow:"0 20px 60px rgba(0,0,0,0.7)",
        display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ background:"linear-gradient(135deg,rgba(109,40,217,0.7),rgba(6,182,212,0.4))", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white">المحرر الذكي</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400">GLOBAL</span>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white transition"><X className="h-4 w-4" /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 shrink-0">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1 py-2 text-[11px] font-bold transition ${
              tab === t.id ? "text-white border-b-2 border-violet-500" : "text-white/40 hover:text-white/70"
            }`}>
            <t.icon className="h-3 w-3" />{t.label}
          </button>
        ))}
      </div>

      {/* ── Design Tab ── */}
      {tab === "design" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex flex-col gap-2 overflow-y-auto p-3 flex-1">
            {designMsgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[95%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap leading-relaxed ${
                  m.role === "user" ? "bg-white/10 text-white/80" : "bg-gradient-to-br from-violet-600/40 to-cyan-500/30 text-white border border-white/10"
                }`}>{m.text}</div>
              </div>
            ))}
            {designLoading && (
              <div className="flex justify-end">
                <div className="flex items-center gap-1.5 rounded-2xl bg-violet-600/30 px-3 py-2 border border-white/10">
                  <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                  <span className="text-xs text-white/60">يعمل ويحفظ للجميع...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div className="flex gap-2 border-t border-white/10 p-3 shrink-0">
            <input value={designInput} onChange={(e) => setDesignInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendDesign()}
              placeholder="أمر تصميم عالمي..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-500/50" />
            <button onClick={sendDesign} disabled={designLoading || !designInput.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white disabled:opacity-40 transition">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Code Tab ── */}
      {tab === "code" && (
        <div className="flex flex-col gap-2 overflow-y-auto p-3 flex-1">
          <p className="text-[10px] text-white/40">اختر ملف، اكتب طلبك، راجع الكود المولّد ثم طبّقه</p>
          <select value={selectedFile} onChange={(e) => loadFile(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none focus:border-violet-500/50"
            style={{ direction:"ltr" }}>
            <option value="">— اختر ملفاً —</option>
            {files.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          {codeMsg && <p className="text-[10px] text-violet-400 bg-violet-500/10 rounded-xl px-2 py-1">{codeMsg}</p>}
          {fileContent && !showDiff && (
            <div className="rounded-xl border border-white/10 bg-black/40 p-2 text-[9px] font-mono text-white/50 max-h-28 overflow-y-auto" style={{ direction:"ltr" }}>
              {fileContent.slice(0, 600)}...
            </div>
          )}
          {showDiff && generatedCode && (
            <div className="space-y-1">
              <p className="text-[10px] text-emerald-400 font-bold">الكود المقترح:</p>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2 text-[9px] font-mono text-white/70 max-h-36 overflow-y-auto" style={{ direction:"ltr" }}>
                {generatedCode.slice(0, 800)}...
              </div>
              <div className="flex gap-2">
                <button onClick={applyCode} disabled={codeLoading}
                  className="flex-1 rounded-xl bg-emerald-500/80 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition disabled:opacity-40">
                  {codeLoading ? "جارٍ الحفظ..." : "✅ طبّق التعديل"}
                </button>
                <button onClick={() => { setShowDiff(false); setGeneratedCode(""); }}
                  className="flex-1 rounded-xl bg-white/10 py-2 text-xs font-bold text-white/70 hover:bg-white/20 transition">
                  ❌ ألغِ
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input value={codePromptInput} onChange={(e) => setCodePromptInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateCode()}
              placeholder={selectedFile ? "اطلب تعديلاً على الكود..." : "اختر ملفاً أولاً"}
              disabled={!selectedFile}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-500/50 disabled:opacity-40" />
            <button onClick={generateCode} disabled={codeLoading || !selectedFile || !codePromptInput.trim()}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white disabled:opacity-40 transition">
              {codeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Notice Tab ── */}
      {tab === "notice" && (
        <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto">
          <p className="text-[10px] text-white/50">أرسل إشعاراً عالمياً يظهر لجميع المستخدمين (مسجّلين وغير مسجّلين)</p>
          <div className="flex gap-1">
            {["info","warning","error","success"].map(t => (
              <button key={t} onClick={() => setNoticeType(t)}
                className={`flex-1 rounded-xl py-1.5 text-[10px] font-bold transition ${noticeType === t ? "bg-violet-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/20"}`}>
                {t === "info" ? "معلومة" : t === "warning" ? "تنبيه" : t === "error" ? "خطأ" : "نجاح"}
              </button>
            ))}
          </div>
          <textarea value={noticeMsg} onChange={(e) => setNoticeMsg(e.target.value)}
            placeholder="نص الإشعار للجميع... مثال: الموقع سيتوقف مؤقتاً للصيانة"
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-violet-500/50 resize-none" />
          {noticeResult && <p className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded-xl px-2 py-1">{noticeResult}</p>}
          <div className="flex gap-2">
            <button onClick={() => publishNotice(true)} disabled={noticeSaving || !noticeMsg.trim()}
              className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2 text-xs font-bold text-white disabled:opacity-40 transition hover:opacity-90">
              {noticeSaving ? "جارٍ النشر..." : "📢 نشر للجميع"}
            </button>
            <button onClick={() => publishNotice(false)} disabled={noticeSaving}
              className="flex-1 rounded-xl bg-red-500/20 py-2 text-xs font-bold text-red-400 hover:bg-red-500/30 transition disabled:opacity-40">
              🚫 إخفاء الإشعار
            </button>
          </div>
        </div>
      )}

      {/* ── Media Tab ── */}
      {tab === "media" && (
        <div className="flex flex-col gap-3 p-4 flex-1 overflow-y-auto">
          <p className="text-[10px] text-white/50">ارفع صورة أو صوت أو فيديو — ستحصل على رابط لاستخدامه في الكود</p>
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 p-4 cursor-pointer hover:border-violet-500/50 transition">
            <ImagePlus className="h-6 w-6 text-white/40" />
            <span className="text-[11px] text-white/50">اختر ملفاً أو اسحب وأفلت</span>
            <input type="file" className="hidden" accept="image/*,audio/*,video/mp4" onChange={handleFileSelect} />
          </label>
          {uploadPreview && (
            <img src={uploadPreview} alt="" className="w-full max-h-28 object-contain rounded-xl border border-white/10" />
          )}
          {uploadFile && !uploadPreview && (
            <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
              <Sparkles className="h-4 w-4 text-violet-400" />
              <span className="text-[11px] text-white/70">{uploadFile.name}</span>
            </div>
          )}
          {uploadFile && (
            <button onClick={doUpload} disabled={uploadLoading}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-2 text-xs font-bold text-white disabled:opacity-40 transition hover:opacity-90">
              {uploadLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "⬆️ رفع الملف"}
            </button>
          )}
          {uploadedUrl && (
            <div className="space-y-1">
              <p className="text-[10px] text-emerald-400">✅ تم الرفع — رابط الملف:</p>
              <div className="flex gap-2 items-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-2 py-1.5">
                <code className="flex-1 text-[10px] text-white/80 break-all">{uploadedUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(uploadedUrl); toast.success("نُسخ!"); }}
                  className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/20">
                  نسخ
                </button>
              </div>
              <p className="text-[9px] text-white/30">استخدم الرابط في كود الصفحة: src="{uploadedUrl}"</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Code Prompt Modal (2-step: confirm key → master key → owner panel) ────
export function EditModeCodePrompt() {
  const { codePrompt, activateStep1, activateStep2, closePrompt, promptStep } = useEditMode();
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef(null);

  const isStep1 = promptStep === 1;
  const maxLen   = isStep1 ? 8 : 30;

  useEffect(() => {
    if (codePrompt) {
      setCode("");
      setErr(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [codePrompt, promptStep]);

  const submit = () => {
    const fn = isStep1 ? activateStep1 : activateStep2;
    const ok = fn(code);
    if (!ok) {
      setErr(true); setCode("");
      setShaking(true); setTimeout(() => setShaking(false), 600);
    }
    // step1 success → context sets promptStep=2 automatically
    // step2 success → context closes prompt & opens owner panel
  };

  if (!codePrompt) return null;
  return (
    <div data-editor-ui className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl" style={{ direction:"rtl" }}>
      {/* Animated bg */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute rounded-full opacity-20"
            style={{ width: 200+i*80, height: 200+i*80, top: `${10+i*12}%`, left: `${5+i*15}%`,
              background: i%2===0 ? "radial-gradient(circle,#6d28d9,transparent)" : "radial-gradient(circle,#0891b2,transparent)" }}
            animate={{ scale:[1,1.2,1], rotate:[0,180,360] }}
            transition={{ duration: 8+i*2, repeat:Infinity, ease:"linear" }} />
        ))}
      </div>

      <motion.div
        key={promptStep}
        initial={{ opacity:0, scale:0.85, y:20 }} animate={{ opacity:1, scale:1, y:0 }}
        transition={{ type:"spring", damping:22 }}
        className={`relative w-[380px] overflow-hidden rounded-3xl border shadow-2xl shadow-violet-500/20 ${shaking ? "animate-[shake_0.4s_ease]" : ""}`}
        style={{ background:"rgba(8,8,20,0.98)", borderColor: isStep1 ? "rgba(139,92,246,0.5)" : "rgba(6,182,212,0.5)" }}>

        {/* Top glow */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${isStep1 ? "from-violet-600 via-cyan-400 to-violet-600" : "from-cyan-500 via-blue-400 to-cyan-500"}`} />

        <div className="relative flex flex-col items-center gap-4 px-7 pb-6 pt-10">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-600/10 to-transparent" />

          {/* Step indicator */}
          <div className="flex items-center gap-2 self-start">
            <div className={`h-2 w-8 rounded-full ${isStep1 ? "bg-violet-500" : "bg-white/20"}`} />
            <div className={`h-2 w-8 rounded-full ${!isStep1 ? "bg-cyan-400" : "bg-white/10"}`} />
          </div>

          {/* Logo */}
          <div className="relative flex h-20 w-20 items-center justify-center">
            <div className={`absolute inset-0 animate-spin-slow rounded-2xl opacity-80 blur-md bg-gradient-to-br ${isStep1 ? "from-violet-600 to-cyan-500" : "from-cyan-500 to-blue-600"}`} />
            <div className={`relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl bg-gradient-to-br ${isStep1 ? "from-violet-700 to-cyan-600" : "from-cyan-600 to-blue-700"}`}>
              <Wand2 className="h-10 w-10 text-white" />
            </div>
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-black text-black shadow-lg">✦</span>
          </div>

          <div className="relative text-center">
            <p className="font-display text-2xl font-black text-white tracking-tight">محرر إتقان الاحترافي</p>
            <p className="mt-1 text-xs text-white/40">
              {isStep1 ? "الخطوة ١ من ٢ — كود التحقق" : "الخطوة ٢ من ٢ — كلمة السر الرئيسية"}
            </p>
          </div>

          {/* Dots (step 1 only) */}
          {isStep1 && (
            <div className="relative flex justify-center gap-2.5">
              {Array.from({length:8}).map((_,i) => (
                <motion.div key={i}
                  animate={i < code.length ? { scale:[1,1.4,1], backgroundColor:["#6d28d9","#22d3ee","#6d28d9"] } : {}}
                  transition={{ duration:0.6, repeat:Infinity }}
                  className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${
                    i < code.length ? "shadow-lg shadow-violet-500/60" : "border border-white/15 bg-white/5"
                  }`}
                />
              ))}
            </div>
          )}

          <input
            ref={inputRef}
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value.slice(0, maxLen)); setErr(false); }}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") submit(); }}
            onClick={(e) => e.stopPropagation()}
            placeholder={isStep1 ? "••••••••" : "كلمة السر الرئيسية..."}
            className={`relative z-10 w-full rounded-2xl border bg-white/5 px-4 py-3 text-white outline-none transition focus:ring-2 ${
              isStep1
                ? "text-center font-mono text-3xl tracking-[0.6em] focus:ring-violet-500/30"
                : "text-right text-sm focus:ring-cyan-500/30"
            }`}
            style={{ borderColor: err ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)" }}
            maxLength={maxLen}
          />

          <AnimatePresence>
            {err && (
              <motion.div initial={{opacity:0,y:-5}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                className="flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm font-bold text-red-400">
                  {isStep1 ? "❌ الكود غير صحيح — حاول مرة أخرى" : "❌ كلمة السر غير صحيحة"}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative z-10 flex w-full gap-3">
            <button
              onMouseDown={(e) => { e.stopPropagation(); submit(); }}
              onClick={(e) => e.stopPropagation()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg hover:opacity-90 transition bg-gradient-to-r ${
                isStep1 ? "from-violet-600 to-cyan-500 shadow-violet-500/20" : "from-cyan-500 to-blue-600 shadow-cyan-500/20"
              }`}>
              <Sparkles className="h-4 w-4" />
              {isStep1 ? "التحقق →" : "فتح لوحة المالك"}
            </button>
            <button
              onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); closePrompt(); }}
              onClick={(e) => e.stopPropagation()}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>

          <p className="flex items-center gap-1.5 text-[10px] text-white/20">
            <Lock className="h-2.5 w-2.5" /> للمسؤولين المعتمدين فقط
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Tool Definitions ──────────────────────────────────────────
const TOOLS = [
  { id: "select",    icon: MousePointer2, label: "تحديد",     group: "nav" },
  { id: "hand",      icon: Hand,          label: "تحريك",     group: "nav" },
  { id: "text",      icon: Type,          label: "تعديل نص",  group: "edit" },
  { id: "textbox",   icon: TextCursor,    label: "إضافة نص",  group: "edit" },
  { id: "image",     icon: ImagePlus,     label: "إضافة صورة",group: "edit" },
  { id: "pen",       icon: Pen,           label: "قلم",       group: "draw" },
  { id: "brush",     icon: Paintbrush,    label: "فرشاة",     group: "draw" },
  { id: "highlighter",icon: Highlighter,  label: "تظليل",     group: "draw" },
  { id: "eraser",    icon: Eraser,        label: "ممحاة",     group: "draw" },
  { id: "eyedropper",icon: Pipette,       label: "قطارة",     group: "pick" },
  { id: "paint",     icon: PaintBucket,   label: "دهان",      group: "pick" },
  { id: "scissors",  icon: Scissors,      label: "مقص",       group: "edit" },
  { id: "clone",     icon: Copy,          label: "نسخ",       group: "edit" },
  { id: "rect",      icon: Square,        label: "مستطيل",    group: "shape" },
  { id: "circle",    icon: Circle,        label: "دائرة",     group: "shape" },
  { id: "line",      icon: Line,          label: "خط",        group: "shape" },
  { id: "star",      icon: Star,          label: "نجمة",      group: "shape" },
  { id: "zoomin",    icon: ZoomIn,        label: "تكبير",     group: "view" },
  { id: "zoomout",   icon: ZoomOut,       label: "تصغير",     group: "view" },
  { id: "grid",      icon: Grid,          label: "شبكة",      group: "view" },
];

const DRAW_TOOLS = ["pen","brush","highlighter","eraser"];

// ─── Main Component ────────────────────────────────────────────
export default function VisualEditorBar() {
  const { isEditMode, deactivate, edits, saveEdit, removeEdit, resetAll, openPrompt } = useEditMode();

  // Selection
  const [selectedEl, setSelectedEl] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  // UI state
  const [activeTool, setActiveTool] = useState("select");
  const [showAI, setShowAI] = useState(false);
  const [activeTab, setActiveTab] = useState("text");
  const [drawColor, setDrawColor] = useState("#6366f1");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gridVisible, setGridVisible] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [editCount, setEditCount] = useState(0);

  // Confirm dialog
  const [confirm, setConfirm] = useState(null);

  // Image modal
  const [imageModal, setImageModal] = useState(null);

  // Panel position
  const [panelPos, setPanelPos] = useState({ top: 90 });
  const clickHandlerRef = useRef(null);

  useEffect(() => { setEditCount(Object.keys(edits).length); }, [edits]);

  // Click to select elements
  useEffect(() => {
    if (!isEditMode) {
      document.removeEventListener("click", clickHandlerRef.current, true);
      setSelectedEl(null);
      setIsDrawing(false);
      return;
    }
    const handler = (e) => {
      const el = e.target;
      if (el.closest("[data-editor-ui]")) return;
      if (el.getAttribute && el.getAttribute("data-editor-overlay")) return;
      if (DRAW_TOOLS.includes(activeTool)) return;
      if (activeTool === "image") {
        e.preventDefault(); e.stopPropagation();
        setImageModal({ x: e.clientX, y: e.clientY });
        return;
      }
      if (activeTool === "textbox") {
        e.preventDefault(); e.stopPropagation();
        const div = document.createElement("div");
        div.contentEditable = "true";
        div.setAttribute("data-editor-overlay", "true");
        div.innerHTML = "اكتب هنا...";
        div.style.cssText = `position:fixed;left:${Math.max(10, e.clientX - 80)}px;top:${Math.max(80, e.clientY - 20)}px;z-index:9981;min-width:140px;min-height:40px;padding:8px 14px;background:rgba(99,102,241,0.15);border:2px dashed rgba(99,102,241,0.6);border-radius:10px;color:#fff;font-size:16px;outline:none;cursor:text;direction:rtl;user-select:text;`;
        div.title = "اكتب النص — اسحب للتحريك — انقر مرتين للحذف";
        let isDragging = false;
        div.addEventListener("mousedown", (ev) => {
          if (ev.target !== div) return;
          isDragging = false;
          const startX = ev.clientX - div.getBoundingClientRect().left;
          const startY = ev.clientY - div.getBoundingClientRect().top;
          const onMove = (mv) => { isDragging = true; div.style.left=(mv.clientX-startX)+"px"; div.style.top=(mv.clientY-startY)+"px"; };
          const onUp = () => { document.removeEventListener("mousemove",onMove); document.removeEventListener("mouseup",onUp); };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        });
        div.addEventListener("dblclick", () => { if (window.confirm("حذف هذا المربع؟")) div.remove(); });
        div.addEventListener("focus", () => { if (div.innerHTML === "اكتب هنا...") div.innerHTML = ""; });
        document.body.appendChild(div);
        setTimeout(() => div.focus(), 50);
        toast.success("✅ مربع نص — اكتب أي شيء");
        return;
      }
      if (activeTool === "scissors") {
        e.preventDefault(); e.stopPropagation();
        setConfirm({
          title: "حذف العنصر",
          message: `هل تريد إخفاء هذا العنصر؟ "${el.textContent?.trim().slice(0,30)}"`,
          danger: true,
          icon: Scissors,
          onConfirm: () => {
            if (isEditableElement(el)) {
              const k = getElementKey(el);
              saveEdit(k, { hidden: true });
              el.style.display = "none";
              toast.success("تم حذف العنصر");
            }
            setConfirm(null);
          },
          onCancel: () => setConfirm(null),
        });
        return;
      }
      if (activeTool === "eyedropper") {
        e.preventDefault(); e.stopPropagation();
        const computed = window.getComputedStyle(el);
        const color = computed.color || "#ffffff";
        toast.success(`🎨 تم نسخ اللون: ${color}`);
        return;
      }
      if (activeTool === "zoomin") {
        setZoom((z) => Math.min(200, z + 10));
        document.body.style.transform = `scale(${Math.min(200, zoom+10)/100})`;
        document.body.style.transformOrigin = "top center";
        return;
      }
      if (activeTool === "zoomout") {
        setZoom((z) => Math.max(50, z - 10));
        document.body.style.transform = `scale(${Math.max(50, zoom-10)/100})`;
        document.body.style.transformOrigin = "top center";
        return;
      }
      if (activeTool === "grid") {
        const existing = document.getElementById("__editor_grid__");
        if (existing) { existing.remove(); setGridVisible(false); }
        else {
          const div = document.createElement("div");
          div.id = "__editor_grid__";
          div.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9990;background-image:linear-gradient(rgba(99,102,241,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.15) 1px,transparent 1px);background-size:20px 20px;";
          document.body.appendChild(div);
          setGridVisible(true);
        }
        return;
      }
      if (!isEditableElement(el)) return;
      if (!el.textContent?.trim()) return;
      e.preventDefault(); e.stopPropagation();
      setSelectedEl(el);
      setSelectedKey(getElementKey(el));
      const rect = el.getBoundingClientRect();
      setPanelPos({ top: Math.max(90, Math.min(rect.top + window.scrollY, window.scrollY + window.innerHeight - 600)) });
      if (activeTool === "text") {
        setTimeout(() => {
          el.contentEditable = "true"; el.focus();
          el.addEventListener("blur", () => {
            el.contentEditable = "false";
            saveEdit(getElementKey(el), { html: el.innerHTML });
            toast.success("✅ تم حفظ النص");
          }, { once: true });
        }, 50);
      }
    };
    document.addEventListener("click", handler, true);
    clickHandlerRef.current = handler;
    return () => document.removeEventListener("click", handler, true);
  }, [isEditMode, activeTool, zoom, saveEdit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "E") { e.preventDefault(); openPrompt(); }
      if (e.key === "Escape" && isEditMode) { setSelectedEl(null); if (isDrawing) setIsDrawing(false); else deactivate(); }
      if (!isEditMode) return;
      // Don't intercept keys when user is typing in an input / textarea / contentEditable
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "t" || e.key === "T") setActiveTool("text");
      if (e.key === "b" || e.key === "B") setActiveTool("brush");
      if (e.key === "e" || e.key === "E" && !e.ctrlKey && !e.shiftKey) setActiveTool("eraser");
      if (e.key === "s" || e.key === "S" && !e.ctrlKey) setActiveTool("scissors");
      if (e.key === "g" || e.key === "G") {
        const existing = document.getElementById("__editor_grid__");
        if (existing) { existing.remove(); setGridVisible(false); }
        else {
          const div = document.createElement("div"); div.id = "__editor_grid__";
          div.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9990;background-image:linear-gradient(rgba(99,102,241,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.15) 1px,transparent 1px);background-size:20px 20px;";
          document.body.appendChild(div); setGridVisible(true);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (history.cursor >= 0) { history.cursor--; toast("↩️ تم التراجع"); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openPrompt, isEditMode, deactivate, isDrawing]);

  const applyStyle = useCallback((prop, value) => {
    if (!selectedEl || !selectedKey) return;
    const current = edits[selectedKey]?.style || {};
    saveEdit(selectedKey, { style: { ...current, [prop]: value } });
    selectedEl.style[prop] = value;
    pushHistory({ type: "style", key: selectedKey, prop, value });
  }, [selectedEl, selectedKey, edits, saveEdit]);

  const makeEditable = useCallback(() => {
    if (!selectedEl) return;
    selectedEl.contentEditable = "true";
    selectedEl.focus();
    selectedEl.addEventListener("blur", () => {
      selectedEl.contentEditable = "false";
      if (selectedKey) saveEdit(selectedKey, { html: selectedEl.innerHTML });
      toast.success("✅ تم حفظ النص");
    }, { once: true });
  }, [selectedEl, selectedKey, saveEdit]);

  const cloneElement = useCallback(() => {
    if (!selectedEl) return;
    const clone = selectedEl.cloneNode(true);
    clone.style.border = "2px dashed #6366f1";
    clone.style.marginTop = "8px";
    selectedEl.parentElement?.insertBefore(clone, selectedEl.nextSibling);
    toast.success("✅ تم نسخ العنصر");
  }, [selectedEl]);

  const hideElement = useCallback(() => {
    setConfirm({
      title: "إخفاء العنصر",
      message: "هل تريد إخفاء هذا العنصر من الصفحة؟",
      danger: true,
      icon: EyeOff,
      onConfirm: () => {
        if (selectedEl && selectedKey) {
          saveEdit(selectedKey, { hidden: true });
          selectedEl.style.display = "none";
          setSelectedEl(null);
          toast.success("تم الإخفاء");
        }
        setConfirm(null);
      },
      onCancel: () => setConfirm(null),
    });
  }, [selectedEl, selectedKey, saveEdit]);

  const resetElement = useCallback(() => {
    setConfirm({
      title: "إعادة تعيين العنصر",
      message: "سيتم حذف جميع التعديلات على هذا العنصر",
      danger: false,
      icon: RotateCcw,
      onConfirm: () => {
        if (selectedEl && selectedKey) {
          removeEdit(selectedKey);
          Object.assign(selectedEl.style, { color:"",backgroundColor:"",fontSize:"",fontWeight:"",fontStyle:"",textDecoration:"",textAlign:"",boxShadow:"",opacity:"",borderRadius:"",letterSpacing:"",lineHeight:"" });
          setSelectedEl(null);
          toast.success("تم الإعادة");
        }
        setConfirm(null);
      },
      onCancel: () => setConfirm(null),
    });
  }, [selectedEl, selectedKey, removeEdit]);

  const handleResetAll = () => {
    setConfirm({
      title: "مسح كل التعديلات",
      message: `سيتم حذف جميع التعديلات (${editCount} تعديل). لا يمكن التراجع عن هذا!`,
      danger: true,
      icon: Trash2,
      onConfirm: () => { resetAll(); document.getElementById("__editor_grid__")?.remove(); setGridVisible(false); setZoom(100); document.body.style.transform=""; toast.success("تم مسح كل التعديلات"); setConfirm(null); },
      onCancel: () => setConfirm(null),
    });
  };

  const handleDeactivate = () => {
    setConfirm({
      title: "الخروج من وضع التحرير",
      message: "هل تريد إغلاق المحرر؟ ستبقى التعديلات المحفوظة.",
      danger: false,
      icon: X,
      onConfirm: () => { setSelectedEl(null); deactivate(); document.body.style.transform=""; setZoom(100); setConfirm(null); },
      onCancel: () => setConfirm(null),
    });
  };

  const fs = useCallback((delta) => {
    if (!selectedEl) return;
    const current = parseFloat(window.getComputedStyle(selectedEl).fontSize) || 16;
    applyStyle("fontSize", Math.max(10, current + delta) + "px");
  }, [selectedEl, applyStyle]);

  const currentStyle = selectedEl ? window.getComputedStyle(selectedEl) : null;
  const isBold = currentStyle ? parseInt(currentStyle.fontWeight) >= 700 : false;
  const isItalic = currentStyle?.fontStyle === "italic";
  const isUnder = currentStyle?.textDecoration?.includes("underline");
  const currentFontSize = currentStyle ? Math.round(parseFloat(currentStyle.fontSize)) : 16;
  const currentOpacity = currentStyle ? Math.round(parseFloat(currentStyle.opacity || 1) * 100) : 100;
  const currentBR = currentStyle ? currentStyle.borderRadius || "0px" : "0px";
  const currentLS = currentStyle ? currentStyle.letterSpacing || "normal" : "normal";
  const currentLH = currentStyle ? currentStyle.lineHeight || "normal" : "normal";

  const PANEL_TABS = [
    { id: "text",    label: "خط", icon: Type },
    { id: "colors",  label: "ألوان", icon: Palette },
    { id: "layout",  label: "تخطيط", icon: SlidersHorizontal },
    { id: "effects", label: "تأثيرات", icon: Sparkles },
    { id: "transform",label:"تحويل",  icon: RotateCw },
  ];

  if (!isEditMode) return <EditModeCodePrompt />;

  return (
    <>
      <EditModeCodePrompt />

      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirm && (
          <ConfirmDialog open={!!confirm} title={confirm.title} message={confirm.message}
            danger={confirm.danger} icon={confirm.icon}
            onConfirm={confirm.onConfirm} onCancel={confirm.onCancel} />
        )}
      </AnimatePresence>

      {/* Drawing Canvas */}
      <AnimatePresence>
        {isDrawing && DRAW_TOOLS.includes(activeTool) && (
          <DrawingCanvas tool={activeTool} color={drawColor} size={brushSize} onClose={() => setIsDrawing(false)} />
        )}
      </AnimatePresence>

      {/* Image Insert Modal */}
      <AnimatePresence>
        {imageModal && (
          <ImageInsertModal position={imageModal} onClose={() => setImageModal(null)} />
        )}
      </AnimatePresence>

      {/* AI Panel */}
      <AnimatePresence>{showAI && <AIPanel onClose={() => setShowAI(false)} />}</AnimatePresence>

      {/* ── Top Bar ── */}
      <motion.div data-editor-ui initial={{ y:-60, opacity:0 }} animate={{ y:0, opacity:1 }} exit={{ y:-60, opacity:0 }}
        transition={{ type:"spring", damping:22 }}
        className="fixed top-0 left-0 right-0 z-[9998] flex items-center justify-between gap-2 px-3 py-2"
        style={{ background:"linear-gradient(135deg,rgba(88,28,220,0.97) 0%,rgba(6,150,200,0.93) 100%)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.12)", direction:"rtl" }}>

        {/* Left: Branding + stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20"><Wand2 className="h-4 w-4 text-white" /></div>
          <span className="hidden font-bold text-white text-sm sm:block">محرر إتقان Pro</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white">{editCount} تعديل</span>
          {zoom !== 100 && <span className="rounded-full bg-amber-400/30 px-2 py-0.5 text-xs font-bold text-amber-200">{zoom}%</span>}
          {gridVisible && <span className="hidden rounded-full bg-cyan-400/30 px-2 py-0.5 text-xs font-bold text-cyan-200 sm:block">شبكة ON</span>}
        </div>

        {/* Center: Tool shortcuts */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id:"select", icon:MousePointer2, label:"V" },
            { id:"text", icon:Type, label:"T" },
            { id:"pen", icon:Pen, label:"P" },
            { id:"brush", icon:Paintbrush, label:"B" },
            { id:"eraser", icon:Eraser, label:"E" },
            { id:"scissors", icon:Scissors, label:"S" },
            { id:"eyedropper", icon:Pipette, label:"I" },
            { id:"zoomin", icon:ZoomIn, label:"+" },
            { id:"grid", icon:Grid, label:"G" },
          ].map((t) => (
            <button key={t.id} onClick={() => setActiveTool(t.id)} title={`${t.id} (${t.label})`}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                activeTool === t.id ? "bg-white/30 text-white ring-2 ring-white/50" : "text-white/70 hover:bg-white/15 hover:text-white"
              }`}>
              <t.icon className="h-4 w-4" />
            </button>
          ))}
          <div className="h-5 w-px bg-white/20 mx-1" />
          {/* Draw mode toggle */}
          {DRAW_TOOLS.includes(activeTool) && (
            <button onClick={() => setIsDrawing((v) => !v)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${isDrawing ? "bg-amber-400 text-black" : "bg-white/15 text-white hover:bg-white/25"}`}>
              <Paintbrush className="h-3.5 w-3.5" /> {isDrawing ? "رسم ON" : "ابدأ الرسم"}
            </button>
          )}
          {isDrawing && (
            <>
              <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="h-8 w-8 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent" title="لون الرسم" />
              <div className="flex items-center gap-1 rounded-lg border border-white/20 px-2 py-1">
                <span className="text-[10px] text-white/60">حجم</span>
                <input type="range" min={1} max={30} value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-16 accent-violet-400" />
                <span className="text-[10px] text-white/60">{brushSize}</span>
              </div>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setShowAI((v) => !v)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${showAI ? "bg-violet-600 text-white" : "bg-white/15 text-white hover:bg-white/25"}`}>
            <Bot className="h-3.5 w-3.5" /> <span className="hidden sm:block">ذكاء اصطناعي</span>
          </button>
          <button onClick={handleResetAll}
            className="flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-500/40 transition">
            <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:block">مسح</span>
          </button>
          <button onClick={handleDeactivate}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/30 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Top bar spacer */}
      <div style={{ height: 44 }} data-editor-ui />

      {/* ── Left Tool Palette ── */}
      <motion.div data-editor-ui initial={{ x:-60, opacity:0 }} animate={{ x:0, opacity:1 }}
        transition={{ type:"spring", damping:22, delay:0.1 }}
        style={{ position:"fixed", top:90, right:16, zIndex:9997, direction:"rtl", width:52, background:"rgba(8,8,20,0.96)", border:"1px solid rgba(139,92,246,0.3)", backdropFilter:"blur(20px)", borderRadius:18, padding:6 }}>
        <div style={{ background:"rgba(8,8,20,0.96)", border:"1px solid rgba(139,92,246,0.3)", backdropFilter:"blur(20px)", borderRadius:16, padding:6 }} data-editor-ui>
          {/* Groups */}
          {["nav","edit","draw","pick","shape","view"].map((group, gi) => (
            <div key={group}>
              {gi > 0 && <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"4px 0" }} />}
              {TOOLS.filter((t) => t.group === group).map((t) => (
                <button key={t.id} onClick={() => { setActiveTool(t.id); if (DRAW_TOOLS.includes(t.id)) {} }}
                  title={t.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all mb-0.5 ${
                    activeTool === t.id
                      ? "bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-md shadow-violet-500/30"
                      : "text-white/50 hover:bg-white/10 hover:text-white"
                  }`}>
                  <t.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          ))}

          {/* Draw color swatch */}
          <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"4px 0" }} />
          <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/20 hover:border-white/40 transition overflow-hidden" title="لون الرسم">
            <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="opacity-0 absolute" />
            <div className="h-5 w-5 rounded-full border-2 border-white/30" style={{ backgroundColor: drawColor }} />
          </label>
        </div>
      </motion.div>

      {/* ── Right Inspector Panel ── */}
      <AnimatePresence>
        {selectedEl && (
          <motion.div data-editor-ui key="inspector"
            initial={{ opacity:0, x:-30, scale:0.95 }} animate={{ opacity:1, x:0, scale:1 }}
            exit={{ opacity:0, x:-30, scale:0.95 }}
            transition={{ type:"spring", damping:24, stiffness:300 }}
            style={{ position:"fixed", top: Math.min(panelPos.top, window.innerHeight - 620), left:72, zIndex:9997, direction:"rtl", width:260 }}
            className="overflow-hidden rounded-2xl shadow-2xl"
          >
            <div style={{ background:"rgba(8,8,20,0.98)", border:"1px solid rgba(139,92,246,0.35)", backdropFilter:"blur(28px)" }}>

              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5"
                style={{ background:"linear-gradient(135deg,rgba(109,40,217,0.6),rgba(6,182,212,0.3))", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-cyan-500">
                    <Layers className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-xs font-bold text-white">تحرير العنصر</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/50 font-mono">{selectedEl.tagName?.toLowerCase()}</span>
                </div>
                <button onClick={() => setSelectedEl(null)} className="rounded-lg p-1 text-white/40 hover:bg-white/10 hover:text-white transition"><X className="h-3.5 w-3.5" /></button>
              </div>

              {/* Quick Edit Button */}
              <div className="px-3 pt-2.5">
                <button onClick={makeEditable}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold text-white transition"
                  style={{ background:"linear-gradient(135deg,#6d28d9,#0891b2)" }}>
                  <Edit3 className="h-4 w-4" /> تعديل النص مباشرةً
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-0.5 overflow-x-auto px-2 pt-2">
                {PANEL_TABS.map((tab) => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                      activeTab === tab.id ? "bg-gradient-to-br from-violet-600/60 to-cyan-500/40 text-white" : "text-white/40 hover:bg-white/10 hover:text-white"
                    }`}>
                    <tab.icon className="h-3 w-3" /> {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="max-h-[440px] overflow-y-auto px-3 pb-3 pt-2 space-y-3">

                {/* TEXT TAB */}
                {activeTab === "text" && (
                  <>
                    {/* Font family */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">عائلة الخط</p>
                      <select onChange={(e) => applyStyle("fontFamily", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none focus:border-violet-500/50">
                        <option value="">— اختر خطاً —</option>
                        {GOOGLE_FONTS.map((f) => <option key={f.name} value={f.css}>{f.name}</option>)}
                      </select>
                    </div>

                    {/* Size + weight */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">الحجم والسُمك</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1">
                          <button onClick={() => fs(-2)} className="text-white/70 hover:text-white font-black text-xs px-1">A-</button>
                          <span className="text-xs text-white font-mono w-8 text-center">{currentFontSize}px</span>
                          <button onClick={() => fs(2)} className="text-white/70 hover:text-white font-black text-sm px-1">A+</button>
                        </div>
                        <button onClick={() => applyStyle("fontWeight", isBold ? "normal" : "bold")}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${isBold ? "border-violet-500 bg-violet-600/50 text-white" : "border-white/10 text-white/50 hover:bg-white/10"}`}>
                          <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => applyStyle("fontStyle", isItalic ? "normal" : "italic")}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${isItalic ? "border-cyan-500 bg-cyan-600/50 text-white" : "border-white/10 text-white/50 hover:bg-white/10"}`}>
                          <Italic className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => applyStyle("textDecoration", isUnder ? "none" : "underline")}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${isUnder ? "border-cyan-500 bg-cyan-600/50 text-white" : "border-white/10 text-white/50 hover:bg-white/10"}`}>
                          <Underline className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Font size presets */}
                    <div className="flex flex-wrap gap-1">
                      {[10,12,14,16,18,20,24,28,32,36,48,64].map((s) => (
                        <button key={s} onClick={() => applyStyle("fontSize", s+"px")}
                          className={`rounded-lg border px-1.5 py-0.5 text-[9px] transition ${currentFontSize===s ? "border-violet-500 bg-violet-600/30 text-white" : "border-white/10 text-white/40 hover:border-violet-500/40 hover:text-white"}`}>
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Alignment */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">المحاذاة</p>
                      <div className="flex gap-1">
                        {[{a:"right",i:AlignRight},{a:"center",i:AlignCenter},{a:"left",i:AlignLeft},{a:"justify",i:AlignLeft}].map(({a,i:Icon}) => (
                          <button key={a} onClick={() => applyStyle("textAlign", a)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition">
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Spacing */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">تباعد</p>
                      {[
                        { label:"تباعد الأحرف", prop:"letterSpacing", vals:["-1px","0","0.5px","1px","2px","4px","8px"] },
                        { label:"ارتفاع السطر",  prop:"lineHeight",    vals:["1","1.2","1.4","1.6","1.8","2","2.5"] },
                      ].map(({ label, prop, vals }) => (
                        <div key={prop} className="mb-1">
                          <p className="text-[8px] text-white/20 mb-1">{label}</p>
                          <div className="flex flex-wrap gap-1">
                            {vals.map((v) => (
                              <button key={v} onClick={() => applyStyle(prop, v)}
                                className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{v}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* COLORS TAB */}
                {activeTab === "colors" && (
                  <>
                    <ColorPicker label="لون النص" value="#ffffff" onChange={(c) => applyStyle("color", c)} />
                    <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"8px 0" }} />
                    <ColorPicker label="لون الخلفية" value="#000000" onChange={(c) => applyStyle("backgroundColor", c)} />
                    <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"8px 0" }} />
                    <ColorPicker label="لون الحدود" value="#6366f1" onChange={(c) => applyStyle("borderColor", c)} />

                    {/* Gradient quick apply */}
                    <div>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-white/30">تدرجات جاهزة للخلفية</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          "linear-gradient(135deg,#6d28d9,#0891b2)",
                          "linear-gradient(135deg,#dc2626,#f97316)",
                          "linear-gradient(135deg,#059669,#0891b2)",
                          "linear-gradient(135deg,#7c3aed,#ec4899)",
                          "linear-gradient(135deg,#d97706,#dc2626)",
                          "linear-gradient(135deg,#111118,#6d28d9)",
                        ].map((g) => (
                          <button key={g} onClick={() => applyStyle("background", g)} title="تطبيق تدرج"
                            className="h-8 rounded-xl border-2 border-white/10 hover:border-white/40 hover:scale-105 transition"
                            style={{ background: g }} />
                        ))}
                      </div>
                    </div>

                    {/* Blend mode */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">وضع المزج</p>
                      <select onChange={(e) => applyStyle("mixBlendMode", e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white outline-none">
                        {BLEND_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {/* LAYOUT TAB */}
                {activeTab === "layout" && (
                  <>
                    {/* Opacity */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">الشفافية ({currentOpacity}%)</p>
                      <input type="range" min={0} max={100} value={currentOpacity}
                        onChange={(e) => applyStyle("opacity", e.target.value/100)}
                        className="w-full accent-violet-500" />
                    </div>

                    {/* Border radius */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">استدارة الزوايا</p>
                      <div className="flex flex-wrap gap-1">
                        {["0","2px","4px","8px","12px","16px","24px","50%","9999px"].map((r) => (
                          <button key={r} onClick={() => applyStyle("borderRadius", r)}
                            className={`rounded-md border px-1.5 py-0.5 text-[9px] transition ${currentBR===r ? "border-violet-500 bg-violet-600/30 text-white" : "border-white/10 text-white/40 hover:border-violet-500/40 hover:text-white"}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Border */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">حدود</p>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {BORDER_STYLES.map((s) => (
                          <button key={s} onClick={() => applyStyle("borderStyle", s)}
                            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{s}</button>
                        ))}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {["1px","2px","3px","4px","6px"].map((w) => (
                          <button key={w} onClick={() => applyStyle("borderWidth", w)}
                            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{w}</button>
                        ))}
                      </div>
                    </div>

                    {/* Padding / Margin */}
                    {[
                      { label: "حشو (padding)", props: ["paddingTop","paddingBottom","paddingLeft","paddingRight"] },
                      { label: "هامش (margin)",  props: ["marginTop","marginBottom","marginLeft","marginRight"] },
                    ].map(({ label, props }) => (
                      <div key={label}>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>
                        <div className="grid grid-cols-2 gap-1">
                          {props.map((prop) => (
                            <div key={prop} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                              <span className="text-[8px] text-white/30 w-8">{prop.replace("padding","p").replace("margin","m").replace("Top","T").replace("Bottom","B").replace("Left","L").replace("Right","R")}</span>
                              <input type="number" min={0} max={200} defaultValue={0}
                                onChange={(e) => applyStyle(prop, e.target.value+"px")}
                                className="w-full bg-transparent text-xs text-white outline-none" />
                              <span className="text-[8px] text-white/20">px</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Width / Height */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">الأبعاد</p>
                      <div className="grid grid-cols-2 gap-1">
                        {["width","height","minWidth","maxWidth"].map((prop) => (
                          <div key={prop} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                            <span className="text-[8px] text-white/30 w-12">{prop}</span>
                            <input type="text" placeholder="auto"
                              onChange={(e) => applyStyle(prop, e.target.value)}
                              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/20" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* EFFECTS TAB */}
                {activeTab === "effects" && (
                  <>
                    {/* CSS Filters */}
                    <div>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-white/30">فلاتر CSS</p>
                      {[
                        { label:"سطوع",   prop:"brightness", min:0, max:200, def:100, unit:"%" },
                        { label:"تباين",  prop:"contrast",   min:0, max:200, def:100, unit:"%" },
                        { label:"تشبع",   prop:"saturate",   min:0, max:200, def:100, unit:"%" },
                        { label:"ضبابية", prop:"blur",       min:0, max:20,  def:0,   unit:"px" },
                        { label:"درجة اللون",prop:"hue-rotate",min:0,max:360,def:0,  unit:"deg" },
                        { label:"سيبيا",  prop:"sepia",      min:0, max:100, def:0,   unit:"%" },
                        { label:"تحويل لرمادي",prop:"grayscale",min:0,max:100,def:0, unit:"%" },
                        { label:"عكس الألوان",prop:"invert", min:0, max:100, def:0,   unit:"%" },
                      ].map(({ label, prop, min, max, def, unit }) => (
                        <FilterSlider key={prop} label={label} prop={prop} min={min} max={max} def={def} unit={unit} applyStyle={applyStyle} />
                      ))}
                    </div>

                    {/* Shadow Builder */}
                    <ShadowBuilder onApply={applyStyle} />

                    {/* Quick animations */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">حركات سريعة</p>
                      <div className="grid grid-cols-2 gap-1">
                        {[
                          { label:"نبض",    css:"pulse 1s infinite" },
                          { label:"اهتزاز", css:"bounce 0.5s infinite" },
                          { label:"دوران",  css:"spin 2s linear infinite" },
                          { label:"تلاشي",  css:"ping 1.5s cubic-bezier(0,0,0.2,1) infinite" },
                        ].map(({ label, css }) => (
                          <button key={label} onClick={() => applyStyle("animation", css)}
                            className="rounded-xl border border-white/10 py-1.5 text-[10px] text-white/60 hover:border-violet-500/40 hover:bg-violet-600/20 hover:text-white transition">
                            {label}
                          </button>
                        ))}
                        <button onClick={() => applyStyle("animation", "none")}
                          className="col-span-2 rounded-xl border border-red-500/20 py-1 text-[10px] text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition">
                          إيقاف الحركة
                        </button>
                      </div>
                    </div>

                    {/* Cursor */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">نوع المؤشر</p>
                      <div className="flex flex-wrap gap-1">
                        {["default","pointer","text","crosshair","move","not-allowed","grab","zoom-in","help"].map((c) => (
                          <button key={c} onClick={() => applyStyle("cursor", c)}
                            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{c}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* TRANSFORM TAB */}
                {activeTab === "transform" && (
                  <>
                    {[
                      { label:"تكبير", prop:"scaleX scaleY", vals:["0.5","0.75","1","1.25","1.5","2","3"] },
                    ].map(({ label, vals }) => (
                      <div key={label}>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">{label}</p>
                        <div className="flex flex-wrap gap-1">
                          {vals.map((v) => (
                            <button key={v} onClick={() => applyStyle("transform", `scale(${v})`)}
                              className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{v}x</button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Rotation */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">دوران</p>
                      <div className="flex flex-wrap gap-1">
                        {["0deg","45deg","90deg","135deg","180deg","-45deg","-90deg","-135deg"].map((r) => (
                          <button key={r} onClick={() => applyStyle("transform", `rotate(${r})`)}
                            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{r}</button>
                        ))}
                      </div>
                    </div>

                    {/* Flip */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">انعكاس</p>
                      <div className="flex gap-1.5">
                        <button onClick={() => applyStyle("transform","scaleX(-1)")}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-white/10 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white transition">
                          <FlipHorizontal className="h-3.5 w-3.5" /> أفقي
                        </button>
                        <button onClick={() => applyStyle("transform","scaleY(-1)")}
                          className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-white/10 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-white transition">
                          <FlipHorizontal className="h-3.5 w-3.5 rotate-90" /> رأسي
                        </button>
                      </div>
                    </div>

                    {/* Skew */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">انحراف</p>
                      <div className="flex gap-1 flex-wrap">
                        {["skewX(10deg)","skewX(20deg)","skewX(-10deg)","skewY(10deg)","skewY(-10deg)"].map((t) => (
                          <button key={t} onClick={() => applyStyle("transform", t)}
                            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{t}</button>
                        ))}
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-white/30">الموضع</p>
                      <div className="flex flex-wrap gap-1">
                        {["static","relative","absolute","fixed","sticky"].map((p) => (
                          <button key={p} onClick={() => applyStyle("position", p)}
                            className="rounded-md border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 hover:border-violet-500/40 hover:text-white transition">{p}</button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div style={{ height:1, background:"rgba(255,255,255,0.07)", margin:"4px 0" }} />
                <div className="grid grid-cols-2 gap-1.5">
                  <button onClick={cloneElement}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition">
                    <Copy className="h-3.5 w-3.5" /> نسخ
                  </button>
                  <button onClick={hideElement}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 transition">
                    <EyeOff className="h-3.5 w-3.5" /> إخفاء
                  </button>
                  {edits[selectedKey] && (
                    <button onClick={resetElement}
                      className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 py-2 text-xs font-bold text-amber-400 hover:bg-amber-400/20 transition">
                      <RotateCcw className="h-3.5 w-3.5" /> إعادة تعيين هذا العنصر
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Global FAB — visible on ALL pages for manager & employee ── */}
      <motion.button
        data-editor-ui
        onClick={isEditMode ? deactivate : openPrompt}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        title={isEditMode ? "إيقاف المحرر البصري" : "تفعيل المحرر البصري (كلمة السر)"}
        className="fixed bottom-6 left-6 z-[9990] flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all"
        style={{
          background: isEditMode
            ? "linear-gradient(135deg,#22c55e,#16a34a)"
            : "linear-gradient(135deg,#7c3aed,#06b6d4)",
          boxShadow: isEditMode
            ? "0 0 20px rgba(34,197,94,0.5)"
            : "0 0 16px rgba(124,58,237,0.4)",
        }}
      >
        <AnimatePresence mode="wait">
          {isEditMode ? (
            <motion.span key="on" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
              <X className="h-5 w-5 text-white" />
            </motion.span>
          ) : (
            <motion.span key="off" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Paintbrush className="h-5 w-5 text-white" />
            </motion.span>
          )}
        </AnimatePresence>
        {isEditMode && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 ring-2 ring-background">
            <span className="h-2 w-2 animate-ping rounded-full bg-emerald-300" />
          </span>
        )}
      </motion.button>
    </>
  );
}
