import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Plus, Trash2, Shield, UserCheck, AlertTriangle, Timer } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, PrimaryButton, StatCard } from "@/components/Kit";
import { useAuth } from "@/context/AuthContext";
import FeatureLock from "@/components/FeatureLock";

const ROLE_LABELS = { co_manager: "مدير مشارك" };
const ROLE_COLORS = { co_manager: "text-violet-400 bg-violet-500/15" };

function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - new Date();
  if (diff <= 0) return "منتهية";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}س ${m}د` : `${m} دقيقة`;
}

const EMPTY = { employee_id: "", elevated_role: "co_manager", duration_hours: 8, reason: "", full_access: true, allowed_modules: [] };

export default function TempAccess() {
  const { company } = useAuth();
  const hasFeature = !!company?.addons?.temp_access?.unlocked;

  const [grants, setGrants] = useState([]);
  const [crew, setCrew] = useState([]);
  const [modules, setModules] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [g, c, m] = await Promise.all([
      api.get("/temp-access").catch(() => ({ data: [] })),
      api.get("/crew").catch(() => ({ data: [] })),
      api.get("/manager-modules").catch(() => ({ data: [] })),
    ]);
    setGrants(g.data);
    setCrew(c.data);
    setModules(m.data);
  };

  useEffect(() => { load(); }, []);

  const toggleModule = (key) => {
    setForm((p) => ({
      ...p,
      allowed_modules: p.allowed_modules.includes(key)
        ? p.allowed_modules.filter((k) => k !== key)
        : [...p.allowed_modules, key],
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.employee_id) { toast.error("اختر موظفاً"); return; }
    if (!form.reason.trim()) { toast.error("السبب مطلوب"); return; }
    if (!form.full_access && form.allowed_modules.length === 0) { toast.error("اختر قسماً واحداً على الأقل أو فعّل صلاحية كاملة"); return; }
    setSaving(true);
    try {
      await api.post("/temp-access", {
        employee_id: form.employee_id,
        elevated_role: form.elevated_role,
        duration_hours: form.duration_hours,
        reason: form.reason,
        allowed_modules: form.full_access ? null : form.allowed_modules,
      });
      toast.success("تم منح الصلاحية المؤقتة ✅");
      setAddOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const revoke = async (id, name) => {
    try {
      await api.delete(`/temp-access/${id}/revoke`);
      toast.success(`تم سحب صلاحية ${name}`);
      load();
    } catch { toast.error("فشل السحب"); }
  };

  const active = grants.filter((g) => !g.is_expired && !g.revoked);
  const expired = grants.filter((g) => g.is_expired || g.revoked);

  if (!hasFeature) {
    return (
      <FeatureLock
        pageTitle="الصلاحيات المؤقتة"
        pageSubtitle="امنح صلاحيات مرفّعة لوقت محدد ثم تنتهي تلقائياً"
        icon={Timer}
        title="الصلاحيات المؤقتة للمشتركين فقط"
        description="ميزة منح صلاحيات مؤقتة للموظفين متاحة في خطة الربع سنوي أو أعلى. قم بالترقية للوصول إليها."
        perks={["رفع صلاحيات الموظف مؤقتاً", "تحديد الأقسام المسموح بها", "انتهاء تلقائي بعد المدة"]}
      />
    );
  }

  return (
    <div>
      <PageHeader title="الصلاحيات المؤقتة" subtitle="امنح صلاحيات مرفّعة لوقت محدد ثم تنتهي تلقائياً" icon={Timer}>
        <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> منح صلاحية</PrimaryButton>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي المنح" value={grants.length} icon={Shield} accent="from-violet-500 to-purple-500" />
        <StatCard label="نشطة حالياً" value={active.length} icon={UserCheck} accent="from-emerald-500 to-teal-500" />
        <StatCard label="منتهية / مسحوبة" value={expired.length} icon={AlertTriangle} accent="from-rose-500 to-pink-500" />
      </div>

      {/* Active grants */}
      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 font-display font-bold text-emerald-400">نشطة الآن ({active.length})</h3>
          <div className="space-y-3">
            {active.map((g) => (
              <GlassCard key={g.id}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-white void-glow">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{g.employee_name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ROLE_COLORS[g.elevated_role] || "text-muted-foreground bg-muted"}`}>
                        {ROLE_LABELS[g.elevated_role] || g.elevated_role}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">السبب: {g.reason}</p>
                    <p className="text-xs text-muted-foreground">منحها: {g.granted_by}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      النطاق: {g.allowed_modules == null
                        ? "كل الصلاحيات"
                        : g.allowed_modules.length === 0
                          ? "بدون صلاحيات إضافية"
                          : g.allowed_modules.map((m) => modules.find((x) => x.key === m)?.label || m).join("، ")}
                    </p>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-bold">{timeLeft(g.expires_at)}</span>
                    </div>
                    <button
                      onClick={() => revoke(g.id, g.employee_name)}
                      className="mt-1 flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-400 transition hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-3 w-3" /> سحب
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {expired.length > 0 && (
        <div>
          <h3 className="mb-3 font-display font-bold text-muted-foreground">السجل ({expired.length})</h3>
          <div className="space-y-2">
            {expired.map((g) => (
              <div key={g.id} className="flex items-center gap-3 rounded-xl border border-border/40 p-3 opacity-60">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="font-medium">{g.employee_name}</span>
                  <span className="mx-2 text-xs text-muted-foreground">←</span>
                  <span className="text-xs text-muted-foreground">{ROLE_LABELS[g.elevated_role] || g.elevated_role}</span>
                </div>
                <span className="text-xs text-rose-400">منتهية</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {grants.length === 0 && (
        <GlassCard className="py-16 text-center">
          <Timer className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد صلاحيات مؤقتة</p>
          <p className="mt-1 text-sm text-muted-foreground">امنح موظفاً صلاحيات مرتفعة لوقت محدد، تنتهي تلقائياً</p>
          <PrimaryButton className="mt-5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> منح صلاحية</PrimaryButton>
        </GlassCard>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="منح صلاحية مؤقتة">
        <form onSubmit={save} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">الموظف</span>
            <select
              value={form.employee_id}
              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-primary"
              required
            >
              <option value="">اختر موظفاً...</option>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.job_title || "موظف"}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">الصلاحية المؤقتة</span>
            <select
              value={form.elevated_role}
              onChange={(e) => setForm({ ...form, elevated_role: e.target.value })}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-primary"
            >
              <option value="co_manager">مدير مشارك — صلاحيات إدارة كاملة مؤقتة</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">المدة (بالساعات)</span>
            <input
              type="number" min={1} max={720}
              value={form.duration_hours}
              onChange={(e) => setForm({ ...form, duration_hours: Number(e.target.value) })}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground">الحد الأقصى 720 ساعة (30 يوم). تنتهي تلقائياً بدون تدخل.</p>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.full_access}
              onChange={(e) => setForm({ ...form, full_access: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm font-medium text-muted-foreground">صلاحية كاملة (كل الأقسام)</span>
          </label>

          {!form.full_access && (
            <div className="rounded-xl border border-input p-3">
              <p className="mb-2 text-sm font-medium text-muted-foreground">حدد الأقسام التي يقدر يتحكم فيها</p>
              <div className="grid grid-cols-2 gap-2">
                {modules.map((m) => (
                  <label key={m.key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.allowed_modules.includes(m.key)}
                      onChange={() => toggleModule(m.key)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">سبب المنح *</span>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={2}
              placeholder="مثال: إجازة المدير المباشر خلال الأسبوع القادم"
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none transition focus:border-primary resize-none"
              required
            />
          </label>

          <div className="flex gap-3 pt-1">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">
              {saving ? "جارٍ المنح..." : "منح الصلاحية"}
            </PrimaryButton>
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
