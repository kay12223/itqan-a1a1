import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Pin } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

export default function Announcements() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/announcements").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/announcements", form);
      toast.success("تم نشر الإعلان");
      setOpen(false); setForm({ title: "", body: "", pinned: false }); load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };
  const remove = async (id) => { await api.delete(`/announcements/${id}`); load(); };

  return (
    <div>
      <PageHeader title="لوحة الإعلانات" subtitle="إعلانات الإدارة لكل الموظفين" icon={Megaphone}>
        {isManager && <PrimaryButton onClick={() => setOpen(true)} data-testid="add-announcement-btn"><Plus className="h-4 w-4" /> إعلان جديد</PrimaryButton>}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((a) => (
          <GlassCard key={a.id} className={a.pinned ? "border-cyan-400/50" : ""} data-testid={`announcement-${a.id}`}>
            <div className="flex items-start justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                {a.pinned && <Pin className="h-4 w-4 text-cyan-400" />} {a.title}
              </h3>
              {isManager && <button onClick={() => remove(a.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">— {a.author}</p>
          </GlassCard>
        ))}
        {items.length === 0 && <GlassCard className="lg:col-span-2 text-center text-muted-foreground">لا توجد إعلانات بعد.</GlassCard>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="إعلان جديد" testId="announcement-modal">
        <form onSubmit={add} className="space-y-4">
          <Field label="العنوان" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required data-testid="ann-title" />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">النص</span>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required data-testid="ann-body" rows={4}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> تثبيت في الأعلى
          </label>
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="ann-submit">{saving ? "جارٍ..." : "نشر"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
