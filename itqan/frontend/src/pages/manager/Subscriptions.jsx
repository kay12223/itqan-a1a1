import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Crown, HardDrive, Users, Check, Sparkles, Phone, Eye, EyeOff,
  Zap, Star, Rocket, Infinity, Gift, ChevronUp, Shield, UserCog,
  MessageCircle, Copy, CheckCircle2,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, PrimaryButton } from "@/components/Kit";

const CONTACT = "01012930571";
const OWNER_WA  = `2${CONTACT}`;

const planIcons = {
  trial: Gift,
  weekly: Zap,
  monthly: Star,
  quarterly: Rocket,
  biannual: Crown,
  yearly: Crown,
  eternal: Infinity,
};

const planColors = {
  trial: "from-slate-500 to-slate-600",
  weekly: "from-blue-500 to-cyan-500",
  monthly: "from-violet-500 to-purple-600",
  quarterly: "from-amber-500 to-orange-500",
  biannual: "from-rose-500 to-pink-600",
  yearly: "from-emerald-500 to-teal-500",
  eternal: "from-yellow-400 to-amber-500",
};

const addonIcons = { storage: HardDrive, accounts: Users, managers: UserCog };

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pwd = "";
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function Subscriptions() {
  const { company, setCompany, refreshCompany, user } = useAuth();
  const [options, setOptions]           = useState(null);
  const [selected, setSelected]         = useState(null);
  const [showPanel, setShowPanel]       = useState(false);  // contact choice panel
  const [generatedPwd, setGeneratedPwd] = useState("");
  const [copied, setCopied]             = useState(false);
  const [sending, setSending]           = useState(false);
  const [waSent, setWaSent]             = useState(false);
  const [activeTab, setActiveTab]       = useState("subscriptions");

  const loadOptions = () => api.get("/void/options").then((r) => setOptions(r.data)).catch(() => {});
  useEffect(() => { loadOptions(); }, []);

  const handleSelect = (id) => {
    setSelected(id);
    const pwd = generatePassword();
    setGeneratedPwd(pwd);
    setWaSent(false);
    setCopied(false);
    setShowPanel(true);
    setTimeout(() => {
      document.getElementById("contact-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  const selectedOpt = options?.subscriptions?.find((o) => o.id === selected)
    || options?.feature_addons?.find((o) => o.id === selected)
    || options?.addon_bundle?.find((o) => o.id === selected)
    || options?.managers?.find((o) => o.id === selected)
    || options?.storage?.find((o) => o.id === selected)
    || options?.accounts?.find((o) => o.id === selected);

  const sendWhatsApp = async () => {
    if (!selectedOpt) return;
    setSending(true);
    const companyId   = company?._id || company?.id || "—";
    const companyName = company?.name || "—";
    const planLabel   = selectedOpt.label || selected;
    const requesterName = user?.name || user?.email || "—";

    // Store the pending request in the backend
    try {
      await api.post("/owner/subscription-request", {
        company_id:         String(companyId),
        company_name:       companyName,
        plan_id:            selected,
        plan_label:         planLabel,
        requester_name:     requesterName,
        generated_password: generatedPwd,
      });
    } catch {
      // non-blocking — still open WhatsApp even if storage fails
    }

    const msg = encodeURIComponent(
      `🔔 *طلب اشتراك جديد — إتقان*\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🏢 اسم الشركة: ${companyName}\n` +
      `🆔 ID الشركة: ${String(companyId).slice(-8)}\n` +
      `📦 الخطة المطلوبة: ${planLabel}\n` +
      `👤 الاسم: ${requesterName}\n` +
      `🔑 كلمة المرور: ${generatedPwd}\n` +
      `━━━━━━━━━━━━━━━━━━`
    );

    window.open(`https://wa.me/${OWNER_WA}?text=${msg}`, "_blank");
    setWaSent(true);
    setSending(false);
    toast.success("تم فتح واتساب — أرسل الرسالة للمالك");
  };

  const copyPwd = () => {
    navigator.clipboard.writeText(generatedPwd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const sub = company?.subscription || {};
  const planLabel = {
    trial: "تجريبي", weekly: "أسبوعي", monthly: "شهري",
    quarterly: "ربع سنوي", biannual: "نصف سنوي", yearly: "سنوي", eternal: "مدى الحياة",
  }[sub.plan_type] || "";

  const tabs = [
    { id: "subscriptions", label: "باقات الاشتراك", icon: Crown },
    { id: "feature_addons", label: "شراء ميزة دائمة", icon: Infinity },
    { id: "addon_bundle", label: "باقة إضافات مجمّعة", icon: Gift },
    { id: "managers", label: "عدد المديرين", icon: UserCog },
    { id: "storage", label: "مساحة تخزين", icon: HardDrive },
    { id: "accounts", label: "حسابات إضافية", icon: Users },
  ];

  const currentOpts = options?.[activeTab] || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="الاشتراكات والباقات"
        subtitle="اختر الباقة المناسبة لشركتك وطوّر تجربتك"
        icon={Crown}
      />

      {/* Current Status */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${company?.is_premium ? "gradient-primary void-glow" : "bg-muted"} text-white`}>
              <Crown className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-xl font-black">
                {company?.is_premium ? `باقة ${planLabel} نشطة ✨` : "الباقة المجانية"}
              </p>
              <p className="text-sm text-muted-foreground">
                {sub.end_date
                  ? `تنتهي في: ${new Date(sub.end_date).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}`
                  : company?.is_premium ? "صلاحية دائمة" : "قم بالترقية للوصول لكل الميزات"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "الحسابات", value: company?.account_limit ?? 6 },
              { label: "المساحة", value: company?.storage_limit_mb >= 1024 ? `${(company.storage_limit_mb / 1024).toFixed(0)} ج.ب` : `${company?.storage_limit_mb ?? 100} م.ب` },
              { label: "المديرون", value: `${company?.manager_limit ?? 1} كحد أقصى` },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border px-5 py-3 text-center">
                <p className="font-display text-2xl font-black gradient-text">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Add-on features status */}
      {company?.addons && (
        <GlassCard>
          <p className="mb-3 font-display font-bold">حالة الإضافات</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { key: "chat", label: "الشات والمساعد الذكي" },
              { key: "vault", label: "الخزنة والعهدة" },
              { key: "company_stats", label: "إحصائيات الشركة" },
              { key: "device_tracking", label: "تتبع الأجهزة والـIP" },
            ].map((f) => {
              const st = company.addons[f.key] || {};
              return (
                <div key={f.key} className={`rounded-2xl border p-3 text-sm ${st.unlocked ? "border-emerald-500/30 bg-emerald-500/5" : "border-border"}`}>
                  <p className="font-bold">{f.label}</p>
                  <p className={`mt-1 text-xs ${st.unlocked ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {st.permanent ? "مفعّلة دائماً مدى الحياة ✨" : st.unlocked ? "مفعّلة حالياً" : "غير مفعّلة"}
                  </p>
                </div>
              );
            })}
          </div>
          {company.addon_bundle?.is_active && (
            <p className="mt-3 text-xs text-cyan-400">
              باقة الإضافات المجمّعة نشطة حتى {new Date(company.addon_bundle.expires_at).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </GlassCard>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id); setSelected(null); setShowPanel(false); }}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
              activeTab === t.id ? "gradient-primary text-white void-glow" : "glass card-hover text-muted-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Plans Grid */}
      <div className={`grid gap-4 ${activeTab === "subscriptions" ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        <AnimatePresence mode="wait">
          {currentOpts.map((opt, i) => {
            const PlanIcon = planIcons[opt.plan] || Star;
            const colorClass = planColors[opt.plan] || "from-blue-500 to-cyan-500";
            const isSelected = selected === opt.id;
            const isFeatured = opt.badge === "الأكثر طلباً";
            const isEternal = opt.plan === "eternal";

            return (
              <motion.div
                key={opt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => handleSelect(opt.id)}
                className={`relative cursor-pointer rounded-3xl border p-5 transition-all duration-200 ${
                  isSelected
                    ? `bg-gradient-to-br ${colorClass} border-transparent text-white shadow-2xl scale-[1.02]`
                    : isFeatured
                    ? "border-violet-500/50 glass ring-2 ring-violet-500/30 card-hover"
                    : isEternal
                    ? "border-yellow-400/40 glass ring-1 ring-yellow-400/20 card-hover"
                    : "border-border glass card-hover"
                }`}
              >
                {opt.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-black whitespace-nowrap ${
                    isSelected ? "bg-white text-gray-900" : isFeatured ? "gradient-primary text-white" : "bg-gradient-to-r from-yellow-400 to-amber-500 text-black"
                  }`}>
                    {opt.badge}
                  </span>
                )}
                {isSelected && (
                  <div className="absolute left-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isSelected ? "bg-white/20" : `bg-gradient-to-br ${colorClass}`} text-white`}>
                    <PlanIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`font-display text-lg font-black ${isSelected ? "text-white" : ""}`}>{opt.label}</p>
                    {opt.days && (
                      <p className={`text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                        {opt.days} يوم
                      </p>
                    )}
                  </div>
                </div>
                <div className="mb-4">
                  {opt.price === 0 ? (
                    <p className={`font-display text-4xl font-black ${isSelected ? "text-white" : "gradient-text"}`}>مجاناً</p>
                  ) : (
                    <div className="flex items-end gap-1">
                      <p className={`font-display text-4xl font-black ${isSelected ? "text-white" : "gradient-text"}`}>
                        {opt.price.toLocaleString()}
                      </p>
                      <p className={`mb-1 text-sm font-bold ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>ج.م</p>
                    </div>
                  )}
                </div>
                {opt.perks && (
                  <ul className={`space-y-2 border-t pt-4 ${isSelected ? "border-white/20" : "border-border"}`}>
                    {opt.perks.map((p, idx) => (
                      <li key={idx} className={`flex items-start gap-2 text-xs ${isSelected ? "text-white/90" : "text-muted-foreground"}`}>
                        <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${isSelected ? "text-white" : "text-cyan-400"}`} />
                        {p}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={`mt-4 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold ${
                  isSelected ? "bg-white/20 text-white" : `bg-gradient-to-r ${colorClass} text-white`
                }`}>
                  {isSelected ? <><Check className="h-4 w-4" /> تم الاختيار</> : <><Sparkles className="h-4 w-4" /> اختر هذه الباقة</>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ── Contact Panel (shown after selecting a plan) ───────────────────── */}
      <AnimatePresence>
        {showPanel && selected && selectedOpt && (
          <motion.div
            id="contact-panel"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
          >
            <GlassCard className="border-green-500/30 ring-2 ring-green-500/10">
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-teal-500 text-white">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold">تواصل مع المالك لتفعيل الباقة</p>
                    <p className="text-xs text-muted-foreground">
                      اختر طريقة التواصل — سيتم إرسال تفاصيلك تلقائياً
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowPanel(false); setSelected(null); }}
                  className="rounded-xl p-2 glass card-hover text-muted-foreground"
                >
                  <ChevronUp className="h-5 w-5" />
                </button>
              </div>

              {/* Selected plan summary */}
              <div className="mb-5 rounded-2xl border border-border bg-background/40 px-4 py-3">
                <p className="text-xs text-muted-foreground mb-1">الباقة المختارة</p>
                <p className="font-display text-lg font-black gradient-text">{selectedOpt.label}</p>
                {selectedOpt.price > 0 && (
                  <p className="text-sm text-muted-foreground">{selectedOpt.price.toLocaleString()} ج.م</p>
                )}
              </div>

              {/* Generated password */}
              <div className="mb-5 rounded-2xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                <p className="mb-2 text-sm font-bold text-cyan-300">🔑 كلمة المرور الخاصة بك</p>
                <div className="flex items-center gap-3">
                  <p className="flex-1 font-mono text-2xl font-black tracking-[0.3em] text-white">{generatedPwd}</p>
                  <button
                    onClick={copyPwd}
                    className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 transition"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "تم النسخ" : "نسخ"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/30">
                  احتفظ بهذه الكلمة — ستحتاجها للتحقق من طلبك
                </p>
              </div>

              {/* Contact buttons */}
              <div className="grid grid-cols-2 gap-3">
                {/* WhatsApp */}
                <button
                  onClick={sendWhatsApp}
                  disabled={sending}
                  className={`flex flex-col items-center gap-2 rounded-2xl border py-5 text-sm font-bold transition ${
                    waSent
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  }`}
                >
                  <MessageCircle className="h-7 w-7" />
                  {waSent ? "✅ تم الإرسال" : "واتساب"}
                  <span className="text-xs font-normal opacity-70">
                    {waSent ? "انتظر رد المالك" : "إرسال تفاصيلك تلقائياً"}
                  </span>
                </button>

                {/* Phone call */}
                <a
                  href={`tel:+${OWNER_WA}`}
                  className="flex flex-col items-center gap-2 rounded-2xl border border-blue-500/40 bg-blue-500/10 py-5 text-sm font-bold text-blue-400 hover:bg-blue-500/20 transition"
                >
                  <Phone className="h-7 w-7" />
                  اتصال
                  <span className="text-xs font-normal opacity-70">{CONTACT}</span>
                </a>
              </div>

              {waSent && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-center text-xs text-emerald-400"
                >
                  ✅ تم إرسال طلبك — سيقوم المالك بتفعيل الباقة لك قريباً
                </motion.p>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact CTA */}
      {!showPanel && (
        <GlassCard className="text-center">
          <p className="mb-1 font-display text-lg font-bold">هل تحتاج مساعدة في الاختيار؟</p>
          <p className="mb-4 text-sm text-muted-foreground">فريقنا متاح دائماً للرد على استفساراتك ومساعدتك في اختيار الباقة الأنسب</p>
          <a
            href={`https://wa.me/${OWNER_WA}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl gradient-primary px-6 py-3 text-sm font-bold text-white void-glow"
          >
            <Phone className="h-4 w-4" /> تواصل معنا على واتساب
          </a>
        </GlassCard>
      )}
    </div>
  );
}
