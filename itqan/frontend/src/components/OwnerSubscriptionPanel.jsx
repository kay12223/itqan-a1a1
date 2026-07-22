import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Crown, Check, Trash2, RefreshCw, ChevronDown,
  Building2, Clock, User, Phone, Shield, Sparkles, AlertTriangle,
  HardDrive, Users, UserCog, Infinity, Gift, Zap, Star, Rocket,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { useEditMode } from "@/context/EditModeContext";

const API = axios.create({ baseURL: "/api" });

/* ── Plan metadata ─────────────────────────────────────────────────────── */
const CATEGORIES = [
  { id: "subscriptions",  label: "باقات الاشتراك",         icon: Crown },
  { id: "feature_addons", label: "ميزات دائمة",            icon: Infinity },
  { id: "addon_bundle",   label: "باقة إضافات مجمّعة",     icon: Gift },
  { id: "managers",       label: "عدد المديرين",            icon: UserCog },
  { id: "storage",        label: "مساحة تخزين",             icon: HardDrive },
  { id: "accounts",       label: "حسابات إضافية",           icon: Users },
];

const VOID_OPTIONS = {
  subscriptions: [
    { id: "sub_trial",     label: "تجريبي (3 أيام)",       price: 0 },
    { id: "sub_weekly",    label: "أسبوعي (7 أيام)",       price: 150 },
    { id: "sub_monthly",   label: "شهري (30 يوم)",         price: 500 },
    { id: "sub_quarterly", label: "ربع سنوي (90 يوم)",    price: 1200 },
    { id: "sub_biannual",  label: "نصف سنوي (180 يوم)",   price: 2000 },
    { id: "sub_yearly",    label: "سنوي (365 يوم)",        price: 3000 },
    { id: "sub_eternal",   label: "مدى الحياة",            price: 9999 },
  ],
  feature_addons: [
    { id: "addon_chat",        label: "الشات والمساعد الذكي",  price: 350 },
    { id: "addon_vault",       label: "الخزنة والعُهدة",       price: 350 },
    { id: "addon_stats",       label: "إحصائيات الشركة",       price: 300 },
    { id: "addon_devices",     label: "تتبع الأجهزة والـIP",   price: 300 },
    { id: "addon_design",      label: "استوديو التصميم",       price: 300 },
    { id: "addon_temp_access", label: "الصلاحيات المؤقتة",    price: 250 },
  ],
  addon_bundle: [
    { id: "bundle_month",  label: "باقة الإضافات — شهر",   price: 900 },
    { id: "bundle_year",   label: "باقة الإضافات — سنة",   price: 8000 },
  ],
  managers: [
    { id: "mgr_1",  label: "مدير واحد",       price: 0 },
    { id: "mgr_2",  label: "مديران اثنان",    price: 300 },
    { id: "mgr_3",  label: "ثلاثة مديرين",   price: 600 },
    { id: "mgr_5",  label: "خمسة مديرين",    price: 900 },
    { id: "mgr_10", label: "عشرة مديرين",    price: 1500 },
  ],
  storage: [
    { id: "st_1024",   label: "+ 1 جيجابايت",   price: 50 },
    { id: "st_5120",   label: "+ 5 جيجابايت",   price: 200 },
    { id: "st_20480",  label: "+ 20 جيجابايت",  price: 600 },
    { id: "st_51200",  label: "+ 50 جيجابايت",  price: 1200 },
    { id: "st_102400", label: "+ 100 جيجابايت", price: 2000 },
  ],
  accounts: [
    { id: "acc_10",  label: "+ 10 حسابات",   price: 120 },
    { id: "acc_50",  label: "+ 50 حساب",     price: 450 },
    { id: "acc_200", label: "+ 200 حساب",    price: 1500 },
    { id: "acc_500", label: "+ 500 حساب",    price: 3000 },
  ],
};

function statusBadge(isPremium) {
  return isPremium
    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    : "text-slate-400 bg-slate-500/10 border-slate-500/20";
}

/* ── Grant modal (shown when owner clicks "منح" on any company) ─────── */
function GrantModal({ company, ck, mk, onClose, onDone, requestId }) {
  const [cat, setCat]         = useState("subscriptions");
  const [optId, setOptId]     = useState("");
  const [loading, setLoading] = useState(false);

  const opts = VOID_OPTIONS[cat] || [];

  const grant = async () => {
    if (!optId) { toast.error("اختر خياراً أولاً"); return; }
    setLoading(true);
    try {
      const { data } = await API.post("/owner/grant-any-option", {
        confirm_key: ck, master_key: mk,
        company_id:  company.id,
        option_id:   optId,
        request_id:  requestId || undefined,
      });
      toast.success(data.message || "✅ تم التفعيل");
      onDone();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "فشل التفعيل");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      style={{ direction: "rtl" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-violet-500/30 shadow-2xl p-6 space-y-5"
        style={{ background: "rgba(8,10,28,0.99)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-black text-white">منح خطة أو ميزة</p>
            <p className="text-xs text-white/40">{company.name}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 bg-white/5 text-white/40 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => { setCat(c.id); setOptId(""); }}
              className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                cat === c.id
                  ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
              }`}
            >
              <c.icon className="h-3 w-3" /> {c.label}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="grid gap-2">
          {opts.map((o) => (
            <button
              key={o.id}
              onClick={() => setOptId(o.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition text-right ${
                optId === o.id
                  ? "border-violet-500/60 bg-violet-500/15 text-violet-300"
                  : "border-white/8 bg-white/3 text-white/70 hover:bg-white/8"
              }`}
            >
              <span>{o.label}</span>
              <div className="flex items-center gap-2">
                {o.price === 0 ? (
                  <span className="text-xs text-emerald-400">مجاني</span>
                ) : (
                  <span className="text-xs text-white/40">{o.price.toLocaleString()} ج.م</span>
                )}
                {optId === o.id && <Check className="h-4 w-4 text-violet-400" />}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={grant}
          disabled={!optId || loading}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-black text-white hover:opacity-90 transition disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {loading ? "جارٍ التفعيل..." : "تفعيل الخطة الآن"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Panel ────────────────────────────────────────────────────────── */
export default function OwnerSubscriptionPanel() {
  const { ownerPanelOpen, closeOwnerPanel, SECRET, MASTER } = useEditMode();
  const ck = SECRET;
  const mk = MASTER;

  const [tab, setTab]               = useState("requests");
  const [requests, setRequests]     = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [search, setSearch]         = useState("");
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [loadingCos, setLoadingCos]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [revokingId, setRevokingId]   = useState(null);
  const [grantModal, setGrantModal]   = useState(null); // { company, requestId? }

  const loadRequests = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const { data } = await API.post("/owner/subscription-requests", { confirm_key: ck, master_key: mk });
      setRequests(data);
    } catch { toast.error("فشل تحميل الطلبات"); }
    finally { setLoadingReqs(false); }
  }, [ck, mk]);

  const loadCompanies = useCallback(async () => {
    setLoadingCos(true);
    try {
      const { data } = await API.post("/owner/companies", { confirm_key: ck, master_key: mk });
      setCompanies(data);
    } catch { toast.error("فشل تحميل الشركات"); }
    finally { setLoadingCos(false); }
  }, [ck, mk]);

  useEffect(() => {
    if (!ownerPanelOpen) return;
    loadRequests();
    loadCompanies();
  }, [ownerPanelOpen, loadRequests, loadCompanies]);

  const deleteRequest = async (id) => {
    setDeletingId(id);
    try {
      await API.post("/owner/delete-subscription-request", { confirm_key: ck, master_key: mk, request_id: id });
      toast.success("تم حذف الطلب");
      setRequests((r) => r.filter((x) => x.id !== id));
    } catch { toast.error("فشل الحذف"); }
    finally { setDeletingId(null); }
  };

  const revokeCompany = async (co) => {
    setRevokingId(co.id);
    try {
      await API.post("/owner/set-subscription", {
        confirm_key: ck, master_key: mk, company_id: co.id, plan_type: "none",
      });
      toast.success(`تم إلغاء اشتراك ${co.name}`);
      loadCompanies();
    } catch { toast.error("فشل الإلغاء"); }
    finally { setRevokingId(null); }
  };

  const refresh = () => { loadRequests(); loadCompanies(); };

  const q = search.toLowerCase();
  const filteredReqs = requests.filter((r) =>
    !q || r.requester_name?.toLowerCase().includes(q) ||
    r.company_name?.toLowerCase().includes(q) ||
    r.generated_password?.toLowerCase().includes(q)
  );
  const filteredCos = companies.filter((c) =>
    !q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
  );

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (!ownerPanelOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-start justify-center overflow-y-auto bg-black/95 backdrop-blur-xl p-4 pt-6"
        style={{ direction: "rtl" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 24 }}
          className="w-full max-w-3xl rounded-3xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden"
          style={{ background: "rgba(6,10,24,0.99)" }}
        >
          {/* ── Header ── */}
          <div className="relative border-b border-white/8 px-6 py-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-violet-500 to-cyan-500" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-display text-lg font-black text-white">لوحة إدارة الاشتراكات</p>
                  <p className="text-xs text-white/30">مخصصة لصاحب الموقع فقط</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={refresh} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button onClick={closeOwnerPanel} className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/50 hover:bg-red-500/20 hover:text-red-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mt-4 relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو كلمة المرور أو اسم الشركة..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 pe-11 text-sm text-white placeholder-white/25 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-2">
              {[
                { id: "requests",  label: `طلبات الواتساب ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
                { id: "companies", label: `الشركات (${companies.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rounded-xl px-5 py-2 text-sm font-bold transition ${
                    tab === t.id
                      ? "bg-gradient-to-r from-cyan-500 to-violet-600 text-white"
                      : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Body ── */}
          <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">

            {/* ══ Requests Tab ══════════════════════════════════════════ */}
            {tab === "requests" && (
              <>
                {loadingReqs && <Spinner />}
                {!loadingReqs && filteredReqs.length === 0 && (
                  <Empty icon={Phone} label="لا توجد طلبات" />
                )}
                {filteredReqs.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl border p-4 space-y-3 ${
                      req.status === "granted"
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-white/8 bg-white/3"
                    }`}
                  >
                    {/* Info row */}
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="h-4 w-4 text-cyan-400" />
                          <span className="font-bold text-white">{req.requester_name}</span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                            req.status === "granted"
                              ? "border-emerald-500/30 text-emerald-400"
                              : "border-amber-500/30 text-amber-400"
                          }`}>
                            {req.status === "granted" ? "✅ مفعّل" : "⏳ معلّق"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/50">
                          <Building2 className="h-3.5 w-3.5" /> {req.company_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Crown className="h-3.5 w-3.5 text-amber-400" />
                          <span className="text-white/50">طلب:</span>
                          <span className="font-bold text-amber-300">{req.plan_label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-white/30">
                          <Clock className="h-3 w-3" />
                          {req.created_at ? new Date(req.created_at).toLocaleString("ar-EG") : "—"}
                        </div>
                      </div>

                      {/* Password box */}
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-center shrink-0">
                        <p className="text-[10px] text-cyan-400/60 mb-1">كود المرور</p>
                        <p className="font-mono text-xl font-black text-cyan-300 tracking-widest">{req.generated_password}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      {req.status !== "granted" && (
                        <button
                          onClick={() => {
                            const co = companies.find((c) => c.id === req.company_id)
                              || { id: req.company_id, name: req.company_name };
                            setGrantModal({ company: co, requestId: req.id });
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition"
                        >
                          <Sparkles className="h-4 w-4" /> منح خطة / ميزة
                        </button>
                      )}
                      {req.status === "granted" && (
                        <span className="text-xs text-emerald-400">✅ تم التفعيل</span>
                      )}
                      <button
                        onClick={() => deleteRequest(req.id)}
                        disabled={deletingId === req.id}
                        className="mr-auto flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* ══ Companies Tab ═════════════════════════════════════════ */}
            {tab === "companies" && (
              <>
                {loadingCos && <Spinner />}
                {!loadingCos && filteredCos.length === 0 && (
                  <Empty icon={Building2} label="لا توجد شركات" />
                )}
                {filteredCos.map((co) => (
                  <motion.div
                    key={co.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-white/8 bg-white/3 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Company info */}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="h-4 w-4 text-violet-400 shrink-0" />
                          <span className="font-bold text-white">{co.name}</span>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusBadge(co.is_premium)}`}>
                            {co.is_premium ? `✨ ${co.plan_type || "Premium"}` : "مجاني"}
                          </span>
                        </div>
                        <p className="text-xs text-white/40">{co.email}</p>
                        {co.end_date && (
                          <p className="text-xs text-white/30">
                            ينتهي: {new Date(co.end_date).toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        )}
                        {/* Limits */}
                        <div className="flex gap-3 mt-1 text-xs text-white/30">
                          <span>حسابات: {co.account_limit}</span>
                          <span>مساحة: {co.storage_limit_mb >= 1024 ? `${(co.storage_limit_mb/1024).toFixed(0)}GB` : `${co.storage_limit_mb}MB`}</span>
                          <span>مديرون: {co.manager_limit}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setGrantModal({ company: co })}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 transition"
                        >
                          <Sparkles className="h-3.5 w-3.5" /> منح
                        </button>
                        {co.is_premium && (
                          <button
                            onClick={() => revokeCompany(co)}
                            disabled={revokingId === co.id}
                            className="flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {revokingId === co.id ? "..." : "إلغاء"}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Grant modal ── */}
        <AnimatePresence>
          {grantModal && (
            <GrantModal
              company={grantModal.company}
              requestId={grantModal.requestId}
              ck={ck}
              mk={mk}
              onClose={() => setGrantModal(null)}
              onDone={() => { loadRequests(); loadCompanies(); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Helpers ───────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
    </div>
  );
}

function Empty({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-white/25">
      <Icon className="h-8 w-8" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
