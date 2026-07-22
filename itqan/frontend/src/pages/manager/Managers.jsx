import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  UserCog, Plus, Trash2, Edit2, Shield, ShieldOff, Crown,
  Phone, Briefcase, Wallet, TrendingDown, TrendingUp,
  X, Save, Eye, EyeOff, Users, Lock, KeyRound, Settings2, Check,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, PrimaryButton } from "@/components/Kit";

const ROLE_LABEL = { manager: "مدير رئيسي", co_manager: "مدير مشارك" };

export default function Managers() {
  const { user: me, company } = useAuth();
  const isPrimary = me?.role === "manager";
  const managerLimit = company?.manager_limit ?? 1;

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    name: "", username: "", password: "", job_title: "مدير مشارك",
    monthly_salary: "", phone: "", description: "",
  });
  const [finForm, setFinForm] = useState({
    monthly_salary: "", total_deductions: "", total_additions: "", description: "",
  });
  const [saving, setSaving] = useState(false);
  const [permTarget, setPermTarget] = useState(null);
  const [permModules, setPermModules] = useState([]);
  const [permSelected, setPermSelected] = useState(null); // null = full access

  useEffect(() => {
    api.get("/manager-modules").then(({ data }) => setPermModules(data)).catch(() => {});
  }, []);

  const openPerms = (mgr) => {
    setPermTarget(mgr);
    setPermSelected(mgr.allowed_modules ?? null);
  };

  const togglePermModule = (key) => {
    setPermSelected((prev) => {
      const cur = prev ?? permModules.map((m) => m.key); // start from "all" if currently unrestricted
      return cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/managers/${permTarget.id}/permissions`, { allowed_modules: permSelected });
      setManagers((p) => p.map((m) => (m.id === data.id ? data : m)));
      setPermTarget(null);
      toast.success("✅ تم تحديث الصلاحيات");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const coManagers = managers.filter(m => m.role === "co_manager");
  const atLimit = coManagers.length >= managerLimit;

  const load = async () => {
    try {
      const { data } = await api.get("/managers");
      setManagers(data);
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/managers/invite", {
        ...form, monthly_salary: Number(form.monthly_salary) || 0,
      });
      setManagers((p) => [...p, data]);
      setShowInvite(false);
      setForm({ name: "", username: "", password: "", job_title: "مدير مشارك", monthly_salary: "", phone: "", description: "" });
      toast.success(`✅ تمت إضافة المدير المشارك: ${data.name}`);
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const openEdit = (mgr) => {
    setEditTarget(mgr);
    setFinForm({
      monthly_salary: mgr.monthly_salary ?? "",
      total_deductions: mgr.total_deductions ?? "",
      total_additions: mgr.total_additions ?? "",
      description: mgr.description ?? "",
    });
  };

  const saveFinance = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/managers/${editTarget.id}`, {
        monthly_salary: Number(finForm.monthly_salary) || 0,
        total_deductions: Number(finForm.total_deductions) || 0,
        total_additions: Number(finForm.total_additions) || 0,
        description: finForm.description || "",
      });
      setManagers((p) => p.map((m) => (m.id === data.id ? data : m)));
      setEditTarget(null);
      toast.success("✅ تم حفظ البيانات المالية");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const toggleActive = async (mgr) => {
    try {
      const { data } = await api.put(`/managers/${mgr.id}`, { is_active: !mgr.is_active });
      setManagers((p) => p.map((m) => (m.id === data.id ? data : m)));
      toast.success(data.is_active ? "تم تفعيل المدير" : "تم تعطيل المدير");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const remove = async (mgr) => {
    if (!window.confirm(`هل أنت متأكد من حذف ${mgr.name}؟`)) return;
    try {
      await api.delete(`/managers/${mgr.id}`);
      setManagers((p) => p.filter((m) => m.id !== mgr.id));
      toast.success("تم حذف المدير المشارك");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const netSalary = (m) =>
    (m.monthly_salary || 0) + (m.total_additions || 0) - (m.total_deductions || 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة المديرين"
        subtitle={`${coManagers.length} / ${managerLimit} مدير مشارك`}
        icon={UserCog}
        action={
          isPrimary && (
            atLimit ? (
              <a href="/app/subscriptions"
                className="flex items-center gap-2 rounded-2xl border border-amber-400/40 px-4 py-2 text-sm font-bold text-amber-400 hover:bg-amber-400/10 transition">
                <Crown className="h-4 w-4" /> ترقية الباقة
              </a>
            ) : (
              <PrimaryButton onClick={() => setShowInvite(true)}>
                <Plus className="h-4 w-4" /> إضافة مدير مشارك
              </PrimaryButton>
            )
          )
        }
      />

      {/* Add Manager Card — always visible shortcut */}
      {isPrimary && !atLimit && !showInvite && (
        <motion.button
          onClick={() => setShowInvite(true)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="w-full flex items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 p-5 text-right hover:border-primary/60 hover:bg-primary/5 transition-all group"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl gradient-primary text-white shadow-lg group-hover:scale-105 transition-transform">
            <Plus className="h-7 w-7" />
          </div>
          <div>
            <p className="font-display text-base font-bold">إضافة مدير مشارك جديد</p>
            <p className="text-sm text-muted-foreground">اضغط هنا لإضافة مدير جديد — أدخل اسمه، اسم المستخدم، وكلمة المرور</p>
          </div>
        </motion.button>
      )}

      {/* Invite Form Modal-style */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <GlassCard className="border-primary/40 ring-2 ring-primary/20">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-display text-xl font-bold flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary text-white">
                    <Plus className="h-5 w-5" />
                  </div>
                  إضافة مدير مشارك
                </h3>
                <button onClick={() => setShowInvite(false)}
                  className="rounded-xl p-2 glass card-hover text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={invite} className="grid gap-4 sm:grid-cols-2">
                {/* Name */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">الاسم الكامل *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none transition"
                    placeholder="مثال: أحمد محمد"
                  />
                </label>

                {/* Username */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">اسم المستخدم للدخول *</span>
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value.replace(/\s/g, "") }))}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none transition"
                    placeholder="مثال: ahmed_manager"
                    dir="ltr"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">سيستخدم هذا الاسم عند تسجيل الدخول</p>
                </label>

                {/* Password */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">كلمة المرور *</span>
                  <div className="relative">
                    <input
                      required
                      type={showPw ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 pe-10 text-sm focus:border-primary/50 focus:outline-none transition"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute inset-y-0 end-3 flex items-center text-muted-foreground hover:text-foreground">
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </label>

                {/* Job Title */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">المسمى الوظيفي</span>
                  <input
                    value={form.job_title}
                    onChange={(e) => setForm((p) => ({ ...p, job_title: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none transition"
                    placeholder="مدير مشارك"
                  />
                </label>

                {/* Phone */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">رقم الهاتف</span>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none transition"
                    placeholder="01X XXXX XXXX"
                  />
                </label>

                {/* Salary */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">الراتب الشهري (ج.م)</span>
                  <input
                    type="number" min="0"
                    value={form.monthly_salary}
                    onChange={(e) => setForm((p) => ({ ...p, monthly_salary: e.target.value }))}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm focus:border-primary/50 focus:outline-none transition"
                    placeholder="5000"
                  />
                </label>

                {/* Description */}
                <label className="block sm:col-span-2">
                  <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">مهامه الأساسية / ملاحظات</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm resize-none focus:border-primary/50 focus:outline-none transition"
                    placeholder="مثال: مسؤول عن متابعة الموظفين ومراجعة التقارير اليومية..."
                  />
                </label>

                <div className="sm:col-span-2 flex justify-end gap-3 pt-2 border-t border-border/50">
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold transition hover:bg-muted">
                    إلغاء
                  </button>
                  <PrimaryButton type="submit" disabled={saving} className="px-6">
                    {saving ? "جارٍ الإضافة..." : <><Plus className="h-4 w-4" /> إضافة المدير</>}
                  </PrimaryButton>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Managers List */}
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">جارٍ التحميل...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {managers.map((mgr, i) => {
            const net = netSalary(mgr);
            const isPrimaryMgr = mgr.role === "manager";
            return (
              <motion.div key={mgr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}>
                <GlassCard className={`relative ${!mgr.is_active ? "opacity-60" : ""}`}>
                  {/* Role badge */}
                  <div className="absolute -top-3 right-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${isPrimaryMgr ? "gradient-primary text-white" : "bg-muted border border-border text-muted-foreground"}`}>
                      {isPrimaryMgr ? "🔑 رئيسي" : "👤 مشارك"}
                    </span>
                  </div>

                  <div className="mt-2 flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-black text-lg ${isPrimaryMgr ? "gradient-primary" : "bg-muted"}`}>
                      {mgr.name?.[0] || "م"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-bold">{mgr.name}</p>
                      <p className="text-xs text-primary font-semibold">{mgr.job_title || ROLE_LABEL[mgr.role]}</p>
                      {mgr.username && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <KeyRound className="h-3 w-3" /> @{mgr.username}
                        </p>
                      )}
                      {mgr.phone && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />{mgr.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {mgr.description && (
                    <div className="mt-3 rounded-xl bg-muted/40 border border-border/50 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> ماذا يعمل
                      </p>
                      <p className="text-xs text-foreground leading-relaxed">{mgr.description}</p>
                    </div>
                  )}

                  {/* Finance */}
                  <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border p-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">الراتب</p>
                      <p className="font-display text-sm font-bold gradient-text">{(mgr.monthly_salary || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الخصومات</p>
                      <p className="font-display text-sm font-bold text-red-400">{(mgr.total_deductions || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">الإضافات</p>
                      <p className="font-display text-sm font-bold text-emerald-400">{(mgr.total_additions || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2">
                    <span className="text-sm text-muted-foreground">الصافي</span>
                    <span className={`font-display font-black ${net >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {net.toLocaleString()} ج.م
                    </span>
                  </div>

                  {/* Actions */}
                  {isPrimary && !isPrimaryMgr && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => openEdit(mgr)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold transition hover:bg-primary/10 hover:border-primary/40 hover:text-primary">
                        <Edit2 className="h-3.5 w-3.5" /> تعديل
                      </button>
                      <button onClick={() => openPerms(mgr)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-violet-500/30 px-3 py-2 text-xs font-bold text-violet-400 transition hover:bg-violet-500/10">
                        <Settings2 className="h-3.5 w-3.5" /> الصلاحيات
                      </button>
                      <button onClick={() => toggleActive(mgr)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold transition hover:bg-muted">
                        {mgr.is_active
                          ? <ShieldOff className="h-3.5 w-3.5 text-amber-400" />
                          : <Shield className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                      <button onClick={() => remove(mgr)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 transition hover:bg-red-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {mgr.allowed_modules != null && (
                    <p className="mt-2 text-[11px] text-violet-400">
                      <Lock className="inline h-3 w-3 me-1" />
                      صلاحيات محدودة: {mgr.allowed_modules.length === 0 ? "بدون أقسام" : mgr.allowed_modules.length + " قسم"}
                    </p>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Finance Edit Modal */}
      <AnimatePresence>
        {editTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <GlassCard className="border-primary/30">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">تعديل بيانات — {editTarget.name}</h3>
                  <button onClick={() => setEditTarget(null)} className="rounded-xl p-2 glass card-hover">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" /> مهامه
                    </span>
                    <textarea value={finForm.description}
                      onChange={(e) => setFinForm((p) => ({ ...p, description: e.target.value }))}
                      rows={2}
                      className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm resize-none" />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Wallet className="h-3 w-3" /> الراتب الشهري (ج.م)
                    </span>
                    <input type="number" min="0" value={finForm.monthly_salary}
                      onChange={(e) => setFinForm((p) => ({ ...p, monthly_salary: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingDown className="h-3 w-3 text-red-400" /> إجمالي الخصومات (ج.م)
                    </span>
                    <input type="number" min="0" value={finForm.total_deductions}
                      onChange={(e) => setFinForm((p) => ({ ...p, total_deductions: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-emerald-400" /> إجمالي الإضافات (ج.م)
                    </span>
                    <input type="number" min="0" value={finForm.total_additions}
                      onChange={(e) => setFinForm((p) => ({ ...p, total_additions: e.target.value }))}
                      className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm" />
                  </label>
                  <div className="rounded-2xl bg-muted/40 px-3 py-2 text-center">
                    <span className="text-sm text-muted-foreground">الصافي: </span>
                    <span className="font-display font-black gradient-text">
                      {(Number(finForm.monthly_salary || 0) + Number(finForm.total_additions || 0) - Number(finForm.total_deductions || 0)).toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setEditTarget(null)}
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted">
                    إلغاء
                  </button>
                  <PrimaryButton onClick={saveFinance} disabled={saving} className="flex-1">
                    <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </PrimaryButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permissions Modal */}
      <AnimatePresence>
        {permTarget && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-sm" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <GlassCard className="border-violet-500/30">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold">صلاحيات — {permTarget.name}</h3>
                  <button onClick={() => setPermTarget(null)} className="rounded-xl p-2 glass card-hover">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => setPermSelected(null)}
                  className={`mb-3 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                    permSelected === null ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-400" : "border-border hover:bg-muted"
                  }`}
                >
                  <span>كل الصلاحيات (بدون قيود)</span>
                  {permSelected === null && <Check className="h-4 w-4" />}
                </button>
                <p className="mb-2 text-xs text-muted-foreground">أو حدد الأقسام المسموح له باستخدامها فقط:</p>
                <div className="max-h-64 space-y-1.5 overflow-y-auto">
                  {permModules.map((m) => {
                    const checked = permSelected !== null && permSelected.includes(m.key);
                    return (
                      <button key={m.key} onClick={() => togglePermModule(m.key)}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                          checked ? "border-violet-400/50 bg-violet-400/10 text-violet-300" : "border-border hover:bg-muted"
                        }`}>
                        <span>{m.label}</span>
                        {checked && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex gap-3">
                  <button onClick={() => setPermTarget(null)}
                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold transition hover:bg-muted">
                    إلغاء
                  </button>
                  <PrimaryButton onClick={savePermissions} disabled={saving} className="flex-1">
                    <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </PrimaryButton>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && managers.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <Lock className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-bold">لا يوجد مديرون مسجلون</p>
        </div>
      )}
    </div>
  );
}
