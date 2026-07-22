import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Palette, Type, Sliders, RotateCcw, Save, Check, Moon, Sun,
  Zap, Eye, Layers, Image, Upload, Sparkles,
  Grid3X3, LayoutTemplate, Brush, Filter, CircleDot,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, PrimaryButton } from "@/components/Kit";
import FeatureLock from "@/components/FeatureLock";

const COLOR_PRESETS = [
  { id: "blue",    label: "أزرق",     primary: "217 91% 60%", accent: "258 90% 66%", glow: "0 120 255" },
  { id: "violet",  label: "بنفسجي",   primary: "258 90% 66%", accent: "280 85% 65%", glow: "120 60 255" },
  { id: "emerald", label: "زمردي",    primary: "160 84% 39%", accent: "168 85% 45%", glow: "16 185 129" },
  { id: "rose",    label: "وردي",     primary: "330 85% 60%", accent: "348 83% 47%", glow: "244 63 94" },
  { id: "amber",   label: "ذهبي",     primary: "38 92% 50%",  accent: "32 95% 44%",  glow: "245 158 11" },
  { id: "cyan",    label: "سماوي",    primary: "188 94% 43%", accent: "200 98% 48%", glow: "6 182 212" },
  { id: "teal",    label: "فيروزي",   primary: "175 84% 32%", accent: "168 86% 30%", glow: "20 184 166" },
  { id: "indigo",  label: "نيلي",     primary: "238 84% 67%", accent: "252 83% 60%", glow: "99 102 241" },
  { id: "red",     label: "أحمر",     primary: "0 84% 60%",   accent: "10 82% 55%",  glow: "239 68 68" },
  { id: "lime",    label: "ليموني",   primary: "80 80% 42%",  accent: "90 78% 38%",  glow: "101 163 13" },
  { id: "pink",    label: "زهري",     primary: "315 80% 65%", accent: "325 78% 60%", glow: "236 72 153" },
  { id: "orange",  label: "برتقالي",  primary: "25 95% 55%",  accent: "20 92% 50%",  glow: "249 115 22" },
];

const FONT_FAMILIES = [
  { id: "cairo",      label: "Cairo — القاهرة",         family: "'Cairo', 'Tajawal', sans-serif" },
  { id: "tajawal",    label: "Tajawal — تجوال",          family: "'Tajawal', 'Cairo', sans-serif" },
  { id: "alexandria", label: "Alexandria — الإسكندرية", family: "'Alexandria', 'Tajawal', sans-serif" },
  { id: "noto",       label: "Noto Kufi Arabic",          family: "'Noto Kufi Arabic', sans-serif" },
];

const RADIUS_OPTIONS = [
  { id: "none", label: "حاد",        value: "0" },
  { id: "sm",   label: "خفيف",       value: "0.5rem" },
  { id: "md",   label: "معتدل",      value: "0.75rem" },
  { id: "lg",   label: "مدوّر",      value: "1rem" },
  { id: "xl",   label: "دائري",      value: "1.5rem" },
  { id: "full", label: "كامل",       value: "9999px" },
];

const BG_PATTERNS = [
  { id: "none",  label: "بدون",   css: "none" },
  { id: "dots",  label: "نقاط",   css: "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)", size: "24px 24px" },
  { id: "grid",  label: "شبكة",   css: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)", size: "32px 32px" },
  { id: "lines", label: "خطوط",   css: "repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.02) 20px, rgba(255,255,255,0.02) 21px)" },
  { id: "cross", label: "متقاطع", css: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", size: "16px 16px" },
];

const BG_SIZES   = ["cover", "contain", "100% 100%", "auto"];
const BG_SIZES_LABEL = ["تملأ الشاشة", "كاملة بحدودها", "تمتد بالكامل", "حجمها الطبيعي"];
const BG_POS     = ["center", "top", "bottom", "left", "right"];
const BG_POS_AR  = ["منتصف", "أعلى", "أسفل", "يسار", "يمين"];

const STORAGE_KEY = "itqan_design_settings";

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

/* ─── central apply function ─── */
function applySettings(s) {
  const root = document.documentElement;

  // Colors
  if (s.primary) root.style.setProperty("--primary", s.primary);
  if (s.accent)  root.style.setProperty("--accent",  s.accent);
  if (s.glow)    root.style.setProperty("--glow",    s.glow);

  // Layout radius
  if (s.radius) root.style.setProperty("--radius", s.radius);

  // Typography
  if (s.fontFamily) document.body.style.fontFamily = s.fontFamily;
  if (s.fontSize)   document.body.style.fontSize   = s.fontSize + "px";

  // Animations
  s.animationsOff ? root.classList.add("no-animations") : root.classList.remove("no-animations");

  // Glow
  s.glowOff ? root.classList.add("no-glow") : root.classList.remove("no-glow");

  // Blur / Glass
  s.blurOff ? root.classList.add("no-blur") : root.classList.remove("no-blur");

  // Particles (canvas element rendered by VoidParticles)
  const particles = document.querySelector("[data-testid='void-particles']");
  if (particles) particles.style.display = s.particlesOff ? "none" : "";

  // Page filter (brightness / saturation)
  const br = s.brightness || 100;
  const sat = s.saturation || 100;
  root.style.filter = (br !== 100 || sat !== 100) ? `brightness(${br}%) saturate(${sat}%)` : "";

  // Background image — managed overlay element (proper opacity support)
  let bgEl = document.getElementById("itqan-bg-overlay");
  if (s.bgImage) {
    if (!bgEl) {
      bgEl = document.createElement("div");
      bgEl.id = "itqan-bg-overlay";
      bgEl.style.cssText = [
        "position:fixed", "inset:0", "z-index:-2", "pointer-events:none",
        "transition:opacity 0.4s",
      ].join(";") + ";";
      document.body.prepend(bgEl);
    }
    bgEl.style.backgroundImage    = `url(${s.bgImage})`;
    bgEl.style.backgroundSize     = s.bgSize     || "cover";
    bgEl.style.backgroundPosition = s.bgPosition || "center";
    bgEl.style.backgroundRepeat   = s.bgRepeat   || "no-repeat";
    bgEl.style.opacity            = (s.bgOpacity ?? 40) / 100;
  } else {
    if (bgEl) bgEl.style.backgroundImage = "";
  }

  // Background pattern
  if (s.bgPattern && s.bgPattern !== "none") {
    const pat = BG_PATTERNS.find((p) => p.id === s.bgPattern);
    if (pat) {
      root.style.setProperty("--bg-pattern", pat.css);
      if (pat.size) root.style.setProperty("--bg-pattern-size", pat.size);
    }
  } else {
    root.style.removeProperty("--bg-pattern");
  }
}

export default function DesignStudio() {
  const { theme, toggle } = useTheme();
  const { company, refreshCompany } = useAuth();
  const [settings, setSettings] = useState(() => ({ ...loadSettings() }));
  const [activePreset, setActivePreset] = useState(null);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("colors");
  const fileRef = useRef(null);
  const logoRef = useRef(null);

  const hasDesign = !!company?.addons?.design?.unlocked;

  useEffect(() => { refreshCompany(); }, [refreshCompany]);

  useEffect(() => { if (hasDesign) applySettings(settings); }, [settings, hasDesign]);

  const S = (key, val) => setSettings((s) => ({ ...s, [key]: val }));

  const applyPreset = (preset) => {
    setActivePreset(preset.id);
    setSettings((s) => ({ ...s, primary: preset.primary, accent: preset.accent, glow: preset.glow }));
  };

  const saveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    toast.success("تم حفظ إعدادات التصميم ✅");
    setTimeout(() => setSaved(false), 2000);
  };

  const resetSettings = () => {
    localStorage.removeItem(STORAGE_KEY);
    const root = document.documentElement;
    ["--primary","--accent","--glow","--radius","--bg-pattern","--bg-pattern-size"].forEach(
      (v) => root.style.removeProperty(v)
    );
    document.body.style.removeProperty("font-family");
    document.body.style.removeProperty("font-size");
    root.style.filter = "";
    root.classList.remove("no-animations","no-glow","no-blur");
    const bgEl = document.getElementById("itqan-bg-overlay");
    if (bgEl) bgEl.remove();
    const particles = document.querySelector("[data-testid='void-particles']");
    if (particles) particles.style.display = "";
    setSettings({});
    setActivePreset(null);
    toast.success("تم إعادة التصميم للحالة الافتراضية");
  };

  const handleImageUpload = (e, key) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("الصورة أكبر من 5 ميجا"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { S(key, ev.target.result); toast.success("تم رفع الصورة ✅"); };
    reader.readAsDataURL(file);
  };

  // Toggle helper: flips a boolean, then immediately applies side-effect
  const toggleEffect = (key) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Apply side-effects with the NEW value
      const newVal = next[key];
      const root   = document.documentElement;
      if (key === "animationsOff") newVal ? root.classList.add("no-animations")    : root.classList.remove("no-animations");
      if (key === "glowOff")       newVal ? root.classList.add("no-glow")           : root.classList.remove("no-glow");
      if (key === "blurOff")       newVal ? root.classList.add("no-blur")           : root.classList.remove("no-blur");
      if (key === "particlesOff") {
        const el = document.querySelector("[data-testid='void-particles']");
        if (el) el.style.display = newVal ? "none" : "";
      }
      return next;
    });
  };

  const TABS = [
    { id: "colors",     label: "الألوان",   icon: Palette },
    { id: "typography", label: "الخطوط",    icon: Type },
    { id: "layout",     label: "التخطيط",   icon: LayoutTemplate },
    { id: "background", label: "الخلفية",   icon: Image },
    { id: "logo",       label: "الشعار",    icon: CircleDot },
    { id: "effects",    label: "التأثيرات", icon: Sparkles },
  ];

  // ── Subscription gate ──────────────────────────────────────────────────
  if (!hasDesign) {
    return (
      <FeatureLock
        pageTitle="استوديو التصميم"
        pageSubtitle="خصّص مظهر المنصة — ألوان، خطوط، خلفيات، تأثيرات"
        icon={Palette}
        title="استوديو التصميم للمشتركين فقط"
        description="خصّص ألوان المنصة وخطوطها وخلفياتها وتأثيراتها البصرية. متاح للمشتركين أو لمن اشترى هذه الإضافة."
        perks={["ألوان وخطوط مخصصة", "خلفيات وتأثيرات بصرية", "شعار الشركة والهوية"]}
      />
    );
  }
  // ───────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader title="استوديو التصميم" subtitle="خصّص مظهر المنصة — ألوان، خطوط، خلفيات، تأثيرات" icon={Palette}>
        <div className="flex gap-2">
          <button onClick={resetSettings} className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold text-muted-foreground card-hover">
            <RotateCcw className="h-4 w-4" /> إعادة تعيين
          </button>
          <PrimaryButton onClick={saveSettings}>
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "تم الحفظ" : "حفظ"}
          </PrimaryButton>
        </div>
      </PageHeader>

      {/* ── Theme toggle ── */}
      <GlassCard>
        <p className="mb-3 text-sm font-bold text-muted-foreground">وضع العرض</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { id: "void",   label: "مظلم",  sub: "Void Edition",   icon: Moon },
            { id: "clouds", label: "مضيء",  sub: "Clouds Edition", icon: Sun  },
          ].map(({ id, label, sub, icon: Icon }) => (
            <button key={id} onClick={() => theme !== id && toggle()}
              className={`flex items-center gap-2 rounded-2xl border p-3 transition-all ${theme === id ? "gradient-primary border-transparent text-white void-glow" : "border-border glass"}`}
            >
              <Icon className="h-5 w-5" />
              <div className="text-right">
                <p className="font-bold text-sm">{label}</p>
                <p className="text-[10px] opacity-70">{sub}</p>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* ── Tabs ── */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === tab.id ? "gradient-primary text-white void-glow" : "glass border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

          {/* ══ COLORS ══ */}
          {activeTab === "colors" && (
            <>
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Palette className="h-5 w-5 text-primary" /> ألوان جاهزة</h3>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {COLOR_PRESETS.map((preset) => {
                    const isActive = activePreset === preset.id;
                    return (
                      <motion.button key={preset.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => applyPreset(preset)}
                        className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all ${isActive ? "border-white/40 ring-2 ring-white/30" : "border-border glass"}`}
                      >
                        <div className="h-10 w-10 rounded-xl shadow-lg"
                          style={{ background: `linear-gradient(135deg, hsl(${preset.primary}), hsl(${preset.accent}))` }} />
                        <span className="text-[10px] font-bold">{preset.label}</span>
                        {isActive && <Check className="absolute right-1 top-1 h-3 w-3 text-white" />}
                      </motion.button>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Brush className="h-5 w-5 text-primary" /> ألوان مخصصة</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { label: "اللون الأساسي", key: "primary" },
                    { label: "اللون الثانوي", key: "accent" },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">{label}</label>
                      <label className="relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl glass px-3 py-2 transition hover:bg-muted/40">
                        <div className="h-8 w-8 rounded-lg border border-border"
                          style={{ background: settings[key] ? `hsl(${settings[key]})` : `hsl(var(--${key}))` }} />
                        <span className="text-sm text-muted-foreground">اختر اللون</span>
                        <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          onChange={(e) => {
                            const hex = e.target.value;
                            const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
                            const max = Math.max(r,g,b)/255, min = Math.min(r,g,b)/255, l = (max+min)/2;
                            const s2 = max===min ? 0 : (max-min)/(l<0.5 ? max+min : 2-max-min);
                            let h = 0;
                            if (max!==min) {
                              if(r/255===max)      h=(g/255-b/255)/(max-min);
                              else if(g/255===max) h=2+(b/255-r/255)/(max-min);
                              else                 h=4+(r/255-g/255)/(max-min);
                            }
                            h = Math.round(h*60+360)%360;
                            S(key, `${h} ${Math.round(s2*100)}% ${Math.round(l*100)}%`);
                            setActivePreset(null);
                          }}
                        />
                      </label>
                    </div>
                  ))}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-muted-foreground">معاينة</label>
                    <div className="flex h-12 items-center gap-2 rounded-xl glass px-3">
                      <div className="h-6 w-6 rounded-full" style={{ background: "hsl(var(--primary))" }} />
                      <div className="h-6 w-6 rounded-full" style={{ background: "hsl(var(--accent))" }} />
                      <div className="ms-2 h-6 flex-1 rounded-full"
                        style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </>
          )}

          {/* ══ TYPOGRAPHY ══ */}
          {activeTab === "typography" && (
            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Type className="h-5 w-5 text-primary" /> الخطوط والنصوص</h3>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-3 block text-sm font-medium text-muted-foreground">نوع الخط</label>
                  <div className="space-y-2">
                    {FONT_FAMILIES.map((f) => (
                      <button key={f.id} onClick={() => S("fontFamily", f.family)}
                        className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-all ${settings.fontFamily === f.family ? "gradient-primary border-transparent text-white" : "border-border glass hover:border-primary/40"}`}
                        style={{ fontFamily: f.family }}
                      >
                        <span>{f.label}</span>
                        <span className="text-xs opacity-70">أ ب ت ث ج</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
                      <span>حجم الخط</span>
                      <strong className="text-foreground">{settings.fontSize || 16}px</strong>
                    </label>
                    <input type="range" min={13} max={22} step={1} value={settings.fontSize || 16}
                      onChange={(e) => S("fontSize", Number(e.target.value))} className="w-full accent-primary" />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>13</span><span>16</span><span>22</span></div>
                  </div>
                  <div className="rounded-2xl glass p-4">
                    <p style={{ fontSize: (settings.fontSize||16)+"px" }} className="font-bold">نموذج نص عربي</p>
                    <p style={{ fontSize: (settings.fontSize||16)-2+"px" }} className="mt-1 text-muted-foreground">هذا نص ثانوي لمعاينة الخط</p>
                    <p style={{ fontSize: (settings.fontSize||16)+4+"px", fontFamily: settings.fontFamily }} className="mt-2 font-black gradient-text">إتقـان</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          )}

          {/* ══ LAYOUT ══ */}
          {activeTab === "layout" && (
            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Layers className="h-5 w-5 text-primary" /> زوايا العناصر</h3>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {RADIUS_OPTIONS.map((r) => (
                  <button key={r.id} onClick={() => S("radius", r.value)}
                    className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all ${settings.radius === r.value ? "gradient-primary border-transparent text-white" : "border-border glass hover:border-primary/40"}`}
                  >
                    <div className="h-10 w-10 bg-primary/60" style={{ borderRadius: r.value }} />
                    <span className="text-[10px] font-bold">{r.label}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          )}

          {/* ══ BACKGROUND ══ */}
          {activeTab === "background" && (
            <>
              {/* Image upload */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Image className="h-5 w-5 text-primary" /> صورة الخلفية</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => handleImageUpload(e, "bgImage")} />
                    <button onClick={() => fileRef.current?.click()}
                      className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 p-6 hover:border-primary/60 hover:bg-primary/5 transition">
                      <Upload className="h-8 w-8 text-primary" />
                      <p className="font-bold">رفع صورة خلفية</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WebP — حد 5 ميجا</p>
                    </button>
                    {settings.bgImage && (
                      <button onClick={() => { S("bgImage", null); const el = document.getElementById("itqan-bg-overlay"); if (el) el.style.backgroundImage = ""; }}
                        className="w-full rounded-xl border border-red-400/30 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10">
                        حذف صورة الخلفية
                      </button>
                    )}
                  </div>

                  {settings.bgImage ? (
                    <div className="relative overflow-hidden rounded-2xl border border-border bg-black/20 min-h-[120px]">
                      <img src={settings.bgImage} alt="خلفية" className="h-full w-full object-cover max-h-44"
                        style={{ opacity: (settings.bgOpacity ?? 40) / 100 }} />
                      <span className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                        معاينة
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-2xl border border-dashed border-border min-h-[120px] text-xs text-muted-foreground">
                      لا توجد صورة خلفية
                    </div>
                  )}
                </div>

                {settings.bgImage && (
                  <div className="mt-5 space-y-4">
                    {/* Opacity */}
                    <div>
                      <label className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
                        <span>شفافية الصورة</span>
                        <strong className="text-foreground">{settings.bgOpacity ?? 40}%</strong>
                      </label>
                      <input type="range" min={5} max={100} step={5}
                        value={settings.bgOpacity ?? 40}
                        onChange={(e) => S("bgOpacity", Number(e.target.value))}
                        className="w-full accent-primary" />
                      <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>5%</span><span>50%</span><span>100%</span></div>
                    </div>

                    {/* Size */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">حجم الصورة</label>
                      <div className="flex gap-2 flex-wrap">
                        {BG_SIZES.map((sz, i) => (
                          <button key={sz} onClick={() => S("bgSize", sz)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${(settings.bgSize||"cover")===sz ? "gradient-primary border-transparent text-white" : "border-border glass"}`}>
                            {BG_SIZES_LABEL[i]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Position */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">موضع الصورة</label>
                      <div className="flex gap-2 flex-wrap">
                        {BG_POS.map((pos, i) => (
                          <button key={pos} onClick={() => S("bgPosition", pos)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${(settings.bgPosition||"center")===pos ? "gradient-primary border-transparent text-white" : "border-border glass"}`}>
                            {BG_POS_AR[i]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Repeat */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-muted-foreground">تكرار الصورة</label>
                      <div className="flex gap-2 flex-wrap">
                        {[["no-repeat","بدون تكرار"],["repeat","تكرار"],["repeat-x","أفقي"],["repeat-y","رأسي"]].map(([val, lbl]) => (
                          <button key={val} onClick={() => S("bgRepeat", val)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${(settings.bgRepeat||"no-repeat")===val ? "gradient-primary border-transparent text-white" : "border-border glass"}`}>
                            {lbl}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>

              {/* Pattern */}
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Grid3X3 className="h-5 w-5 text-primary" /> نمط الخلفية</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {BG_PATTERNS.map((pat) => (
                    <button key={pat.id} onClick={() => S("bgPattern", pat.id)}
                      className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${settings.bgPattern === pat.id ? "gradient-primary border-transparent text-white" : "border-border glass hover:border-primary/40"}`}>
                      <div className="h-10 w-10 rounded-lg border border-border/50 bg-card"
                        style={pat.id !== "none" ? { backgroundImage: pat.css, backgroundSize: pat.size||"auto" } : {}} />
                      <span className="text-[10px] font-bold">{pat.label}</span>
                    </button>
                  ))}
                </div>
              </GlassCard>
            </>
          )}

          {/* ══ LOGO ══ */}
          {activeTab === "logo" && (
            <GlassCard>
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><CircleDot className="h-5 w-5 text-primary" /> شعار الشركة وأبعاده</h3>

              {/* Preview + upload */}
              <div className="flex items-start gap-5 mb-6">
                <div className="shrink-0 flex items-center justify-center overflow-hidden border border-border bg-card/60"
                  style={{
                    width:  (settings.logoWidth  || 64) + "px",
                    height: (settings.logoHeight || 64) + "px",
                    borderRadius: settings.logoRadius || "16px",
                    transition: "all 0.3s",
                  }}
                >
                  <img src={settings.customLogo || "/logo-itqan.png"} alt="شعار"
                    className="h-full w-full object-contain" />
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={logoRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleImageUpload(e, "customLogo")} />
                  <button onClick={() => logoRef.current?.click()}
                    className="flex w-full items-center gap-2 rounded-xl border border-primary/40 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/10 transition">
                    <Upload className="h-4 w-4" /> رفع شعار جديد
                  </button>
                  {settings.customLogo && (
                    <button onClick={() => S("customLogo", null)}
                      className="w-full rounded-xl border border-red-400/30 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10">
                      حذف الشعار المخصص (رجوع للافتراضي)
                    </button>
                  )}
                </div>
              </div>

              {/* Dimension sliders */}
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div>
                  <label className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
                    <span>العرض</span><strong className="text-foreground">{settings.logoWidth||64} px</strong>
                  </label>
                  <input type="range" min={32} max={180} step={4}
                    value={settings.logoWidth||64} onChange={(e) => S("logoWidth", Number(e.target.value))}
                    className="w-full accent-primary" />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>32</span><span>108</span><span>180</span></div>
                </div>
                <div>
                  <label className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
                    <span>الارتفاع</span><strong className="text-foreground">{settings.logoHeight||64} px</strong>
                  </label>
                  <input type="range" min={32} max={180} step={4}
                    value={settings.logoHeight||64} onChange={(e) => S("logoHeight", Number(e.target.value))}
                    className="w-full accent-primary" />
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>32</span><span>108</span><span>180</span></div>
                </div>
              </div>

              {/* Lock aspect ratio shortcut */}
              <div className="mb-4 flex gap-2">
                {[[32,"صغير"],[64,"افتراضي"],[96,"متوسط"],[128,"كبير"]].map(([sz, lbl]) => (
                  <button key={sz} onClick={() => { S("logoWidth", sz); S("logoHeight", sz); }}
                    className="rounded-xl border border-border glass px-3 py-1.5 text-xs font-bold hover:border-primary/40 transition">
                    {lbl} ({sz}px)
                  </button>
                ))}
              </div>

              {/* Border radius */}
              <div>
                <label className="mb-3 block text-sm font-medium text-muted-foreground">شكل الإطار</label>
                <div className="flex gap-2 flex-wrap">
                  {[["مربع","0px"],["خفيف","8px"],["معتدل","16px"],["مدوّر","24px"],["دائري","9999px"]].map(([lbl, val]) => (
                    <button key={val} onClick={() => S("logoRadius", val)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition-all ${settings.logoRadius===val ? "gradient-primary border-transparent text-white" : "border-border glass"}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => { S("logoWidth",64); S("logoHeight",64); S("logoRadius","16px"); }}
                className="mt-4 rounded-xl border border-border px-4 py-1.5 text-xs font-bold hover:bg-muted/60 transition">
                إعادة تعيين الأبعاد
              </button>
            </GlassCard>
          )}

          {/* ══ EFFECTS ══ */}
          {activeTab === "effects" && (
            <>
              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Zap className="h-5 w-5 text-primary" /> الحركة والتأثيرات</h3>
                <div className="space-y-3">
                  {[
                    { key: "animationsOff", label: "تأثيرات الحركة",         desc: "تحريك الصفحات والعناصر عند الانتقال" },
                    { key: "particlesOff",  label: "النجوم المتحركة",         desc: "تأثير الجسيمات في خلفية الواجهة" },
                    { key: "glowOff",       label: "التوهج (Glow)",           desc: "توهّج الأزرار والعناصر الرئيسية" },
                    { key: "blurOff",       label: "الضبابية (Glass Effect)", desc: "تأثير الزجاج الضبابي على البطاقات" },
                  ].map(({ key, label, desc }) => {
                    const isOn = !settings[key]; // "On" means the effect is active (flag=false)
                    return (
                      <div key={key} className="flex items-center justify-between rounded-2xl glass px-4 py-3">
                        <div>
                          <p className="font-bold">{label}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${isOn ? "text-emerald-400" : "text-muted-foreground"}`}>
                            {isOn ? "مفعّل" : "مُعطَّل"}
                          </span>
                          <button onClick={() => toggleEffect(key)}
                            className={`relative h-7 w-13 rounded-full transition-colors duration-300 ${isOn ? "bg-primary" : "bg-muted"}`}
                            style={{ width: "52px" }}
                          >
                            <span className={`absolute top-1 block h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ${isOn ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>

              <GlassCard>
                <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Filter className="h-5 w-5 text-primary" /> فلاتر الصفحة</h3>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
                      <span>السطوع</span><strong className="text-foreground">{settings.brightness||100}%</strong>
                    </label>
                    <input type="range" min={70} max={130} step={5} value={settings.brightness||100}
                      onChange={(e) => {
                        const br = Number(e.target.value), sat = settings.saturation||100;
                        S("brightness", br);
                        document.documentElement.style.filter = (br!==100||sat!==100) ? `brightness(${br}%) saturate(${sat}%)` : "";
                      }}
                      className="w-full accent-primary" />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>70%</span><span>100%</span><span>130%</span></div>
                  </div>
                  <div>
                    <label className="mb-2 flex justify-between text-sm font-medium text-muted-foreground">
                      <span>التشبّع</span><strong className="text-foreground">{settings.saturation||100}%</strong>
                    </label>
                    <input type="range" min={50} max={200} step={10} value={settings.saturation||100}
                      onChange={(e) => {
                        const sat = Number(e.target.value), br = settings.brightness||100;
                        S("saturation", sat);
                        document.documentElement.style.filter = (br!==100||sat!==100) ? `brightness(${br}%) saturate(${sat}%)` : "";
                      }}
                      className="w-full accent-primary" />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>50%</span><span>100%</span><span>200%</span></div>
                  </div>
                </div>
                <button onClick={() => { S("brightness",100); S("saturation",100); document.documentElement.style.filter=""; }}
                  className="mt-4 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted/60 transition">
                  إعادة تعيين الفلاتر
                </button>
              </GlassCard>
            </>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Live Preview ── */}
      <GlassCard>
        <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Eye className="h-5 w-5 text-primary" /> معاينة التصميم الحالي</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl glass p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold void-glow">م</div>
              <div><p className="font-bold">محمد أحمد</p><p className="text-xs text-muted-foreground">مدير الشركة</p></div>
            </div>
            <div className="rounded-xl gradient-primary p-3 text-white text-center font-bold void-glow">زر رئيسي</div>
            <div className="rounded-xl border border-border p-3 text-center text-sm glass">زر ثانوي</div>
          </div>
          <div className="space-y-3">
            <div className="rounded-2xl glass p-4">
              <p className="text-xs text-muted-foreground mb-1">إجمالي الدخل</p>
              <p className="font-display text-2xl font-black gradient-text">١٢٥,٠٠٠ ج.م</p>
            </div>
            <div className="rounded-2xl glass p-4">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold">الالتزام</span>
                <span className="text-sm font-bold text-emerald-400">٩٢٪</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-full w-[92%] rounded-full bg-primary transition-all" />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-sm">
        <Sliders className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="font-bold">ملاحظة</p>
          <p className="mt-1 text-muted-foreground">التعديلات تُطبَّق فوراً. اضغط «حفظ» لتثبيتها على هذا الجهاز. «إعادة تعيين» تُرجع كل شيء للوضع الافتراضي.</p>
        </div>
      </div>
    </div>
  );
}
