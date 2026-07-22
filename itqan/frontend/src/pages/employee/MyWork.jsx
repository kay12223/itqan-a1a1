import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NotebookPen, Plus, Trash2, Clock, CheckCircle2 } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

export default function MyWork() {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", price: "" });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/work-logs").then((r) => setLogs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/work-logs", { description: form.description, price: Number(form.price) || 0 });
      toast.success("تم تسجيل العمل — بانتظار اعتماد المدير");
      setOpen(false); setForm({ description: "", price: "" }); load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  const remove = async (id) => { await api.delete(`/work-logs/${id}`); load(); };

  const approved = logs.filter((l) => l.status === "approved");
  const total = approved.reduce((s, l) => s + l.price, 0);

  return (
    <div>
      <PageHeader title="أعمالي" subtitle="سجّل ما أنجزته من أعمال وسعرها — يعتمدها المدير وتظهر في كشف آخر الشهر" icon={NotebookPen}>
        <PrimaryButton onClick={() => setOpen(true)} data-testid="add-work-btn"><Plus className="h-4 w-4" /> تسجيل عمل</PrimaryButton>
      </PageHeader>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <GlassCard className="text-center"><p className="font-display text-3xl font-black gradient-text">{logs.length}</p><p className="text-xs text-muted-foreground">إجمالي الأعمال</p></GlassCard>
        <GlassCard className="text-center"><p className="font-display text-3xl font-black text-emerald-400">{approved.length}</p><p className="text-xs text-muted-foreground">معتمدة</p></GlassCard>
        <GlassCard className="text-center"><p className="font-display text-3xl font-black text-cyan-400">{total.toLocaleString()}</p><p className="text-xs text-muted-foreground">قيمة المعتمد ($)</p></GlassCard>
      </div>

      <GlassCard>
        <h3 className="mb-4 font-display text-lg font-bold">دفتر أعمالي</h3>
        <div className="space-y-2">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-xl border border-border p-3" data-testid={`work-${l.id}`}>
              <div>
                <p className="font-bold">{l.description}</p>
                <p className="text-xs text-muted-foreground font-mono-x">{l.work_date} · {l.price.toLocaleString()} $</p>
              </div>
              <div className="flex items-center gap-2">
                {l.status === "approved" ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-4 w-4" /> معتمد</span>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-xs text-amber-400"><Clock className="h-4 w-4" /> بانتظار</span>
                    <button onClick={() => remove(l.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          {logs.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لم تسجّل أي عمل بعد.</p>}
        </div>
      </GlassCard>

      <Modal open={open} onClose={() => setOpen(false)} title="تسجيل عمل منجز" testId="work-modal">
        <form onSubmit={add} className="space-y-4">
          <Field label="وصف العمل" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required data-testid="work-desc" placeholder="مثال: تركيب شبكة لعميل X" />
          <Field label="سعر العمل ($)" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="work-price" />
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="work-submit">{saving ? "جارٍ..." : "تسجيل"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
