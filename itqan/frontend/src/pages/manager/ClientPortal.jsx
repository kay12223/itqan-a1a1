import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Plus, Copy, Eye, Trash2, Link2, CheckCircle2, Clock } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton, StatCard } from "@/components/Kit";

const STATUS_LABELS = { active: "نشط", expired: "منتها", revoked: "مسحوب" };
const STATUS_COLORS = { active: "text-emerald-400 bg-emerald-500/15", expired: "text-slate-400 bg-slate-500/15", revoked: "text-rose-400 bg-rose-500/15" };

const EMPTY = { client_name: "", client_email: "", project_name: "", description: "", expires_days: 30 };

export default function ClientPortal() {
  const [portals, setPortals] = useState([]);
  const [projects, setProjects] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [p, pr] = await Promise.all([
      api.get("/client-portals").catch(() => ({ data: [] })),
      api.get("/projects").catch(() => ({ data: [] })),
    ]);
    setPortals(p.data);
    setProjects(pr.data);
  };
  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.project_name.trim()) { toast.error("اسم العميل والمشروع مطلوبان"); return; }
    setSaving(true);
    try {
      await api.post("/client-portals", form);
      toast.success("تم إنشاء بوابة العميل ✅");
      setAddOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const copyLink = (token) => {
    const link = `${window.location.origin}/portal/${token}`;
    navigator.clipboard.writeText(link).then(() => toast.success("تم نسخ الرابط 📋"));
  };

  const revoke = async (id) => {
    try { await api.delete(`/client-portals/${id}`); toast.success("تم سحب البوابة"); load(); }
    catch { toast.error("فشل السحب"); }
  };

  const active = portals.filter((p) => p.status === "active");

  return (
    <div>
      <PageHeader title="بوابة العميل" subtitle="روابط آمنة لعملائك لمتابعة مشاريعهم" icon={Globe}>
        <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> بوابة جديدة</PrimaryButton>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي البوابات" value={portals.length} icon={Globe} accent="from-blue-500 to-cyan-500" />
        <StatCard label="نشطة" value={active.length} icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
        <StatCard label="منتهية/مسحوبة" value={portals.length - active.length} icon={Clock} accent="from-rose-500 to-pink-500" />
      </div>

      {portals.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Globe className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد بوابات عملاء بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">أرسل لعميلك رابطاً خاصاً يتابع فيه مشروعه بدون أي دخول للنظام</p>
          <PrimaryButton className="mt-5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> إنشاء بوابة</PrimaryButton>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {portals.map((p, i) => {
            const sc = STATUS_COLORS[p.status] || STATUS_COLORS.expired;
            const sl = STATUS_LABELS[p.status] || p.status;
            return (
              <GlassCard key={p.id} hover delay={i * 0.04}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-white">
                      <Globe className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-bold">{p.client_name}</p>
                      <p className="text-xs text-muted-foreground">{p.project_name}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sc}`}>{sl}</span>
                </div>

                {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
                <p className="mt-2 text-xs text-muted-foreground">ينتهي: {p.expires_at ? new Date(p.expires_at).toLocaleDateString("ar-EG") : "—"}</p>

                <div className="mt-4 flex gap-2 border-t border-border/40 pt-3">
                  {p.status === "active" && (
                    <button
                      onClick={() => copyLink(p.token)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-input py-2 text-xs font-bold transition hover:bg-white/5"
                    >
                      <Copy className="h-3.5 w-3.5" /> نسخ الرابط
                    </button>
                  )}
                  {p.status === "active" && (
                    <a
                      href={`/portal/${p.token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-input py-2 text-xs font-bold transition hover:bg-white/5"
                    >
                      <Eye className="h-3.5 w-3.5" /> معاينة
                    </a>
                  )}
                  <button
                    onClick={() => revoke(p.id)}
                    className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إنشاء بوابة عميل">
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم العميل *" value={form.client_name} onChange={f("client_name")} placeholder="اسم العميل أو الشركة" required />
            <Field label="البريد (اختياري)" type="email" value={form.client_email} onChange={f("client_email")} placeholder="client@email.com" />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">المشروع *</span>
            <select
              value={form.project_name}
              onChange={(e) => setForm((p) => ({ ...p, project_name: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none"
              required
            >
              <option value="">اختر مشروعاً أو اكتب اسماً...</option>
              {projects.map((pr) => <option key={pr.id} value={pr.name}>{pr.name}</option>)}
            </select>
          </label>

          {!projects.find((p) => p.name === form.project_name) && (
            <Field label="أو اكتب اسم المشروع يدوياً" value={form.project_name} onChange={f("project_name")} placeholder="اسم المشروع" />
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">وصف للعميل (اختياري)</span>
            <textarea value={form.description} onChange={f("description")} rows={2} placeholder="ما الذي يراه العميل في هذه البوابة..." className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none resize-none" />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">مدة الصلاحية (بالأيام)</span>
            <input type="number" min={1} max={365} value={form.expires_days} onChange={f("expires_days")} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none" />
          </label>

          <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-300">
            <Link2 className="mb-1 h-4 w-4" />
            سيُنشأ رابط خاص للعميل لمتابعة المشروع فقط — بدون دخول للنظام الداخلي
          </div>

          <div className="flex gap-3 pt-1">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">{saving ? "جارٍ الإنشاء..." : "إنشاء البوابة"}</PrimaryButton>
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
