import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, Phone, User, CheckCircle2, XCircle, Building2 } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton, StatCard } from "@/components/Kit";

const EMPTY = { name: "", city: "", address: "", phone: "", manager_name: "", is_active: true };

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(null);
  const [delTarget, setDelTarget] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/branches");
      setBranches(data);
    } catch { toast.error("تعذّر تحميل الفروع"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const openAdd = () => { setForm(EMPTY); setAddOpen(true); };
  const openEdit = (b) => {
    setForm({ name: b.name, city: b.city, address: b.address, phone: b.phone, manager_name: b.manager_name, is_active: b.is_active });
    setEditOpen(b);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("اسم الفرع مطلوب"); return; }
    setSaving(true);
    try {
      if (editOpen) {
        await api.put(`/branches/${editOpen.id}`, form);
        toast.success("تم تحديث الفرع");
        setEditOpen(null);
      } else {
        await api.post("/branches", form);
        toast.success("تم إضافة الفرع");
        setAddOpen(false);
      }
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/branches/${delTarget.id}`);
      toast.success("تم حذف الفرع");
      setDelTarget(null);
      load();
    } catch { toast.error("فشل الحذف"); }
  };

  const active = branches.filter((b) => b.is_active).length;
  const inactive = branches.length - active;
  const totalEmp = branches.reduce((s, b) => s + (b.employee_count || 0), 0);

  return (
    <div>
      <PageHeader title="إدارة الفروع" subtitle="كل مواقع وفروع شركتك في مكان واحد" icon={MapPin}>
        <PrimaryButton onClick={openAdd}><Plus className="h-4 w-4" /> إضافة فرع</PrimaryButton>
      </PageHeader>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي الفروع" value={branches.length} icon={Building2} accent="from-violet-500 to-purple-500" />
        <StatCard label="فروع نشطة" value={active} icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
        <StatCard label="فروع معلقة" value={inactive} icon={XCircle} accent="from-rose-500 to-pink-500" />
        <StatCard label="إجمالي الموظفين" value={totalEmp} icon={User} accent="from-blue-500 to-cyan-500" />
      </div>

      {/* Branches grid */}
      {loading ? (
        <div className="py-20 text-center text-muted-foreground">جارٍ التحميل…</div>
      ) : branches.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <MapPin className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد فروع بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">أضف أول فرع لشركتك الآن</p>
          <PrimaryButton className="mt-5" onClick={openAdd}><Plus className="h-4 w-4" /> إضافة فرع</PrimaryButton>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b, i) => (
            <GlassCard key={b.id} hover delay={i * 0.04}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-white void-glow">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display font-bold leading-tight">{b.name}</p>
                    {b.city && <p className="text-xs text-muted-foreground">{b.city}</p>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${b.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                  {b.is_active ? "نشط" : "معلق"}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-sm">
                {b.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />{b.address}
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />{b.phone}
                  </div>
                )}
                {b.manager_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-3.5 w-3.5 shrink-0" />{b.manager_name}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-xs text-muted-foreground">
                  {b.employee_count || 0} موظف
                </span>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(b)} className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setDelTarget(b)} className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      <Modal open={addOpen || !!editOpen} onClose={() => { setAddOpen(false); setEditOpen(null); }} title={editOpen ? "تعديل الفرع" : "إضافة فرع جديد"}>
        <form onSubmit={save} className="space-y-3">
          <Field label="اسم الفرع *" value={form.name} onChange={f("name")} placeholder="مثال: فرع الرياض" required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="المدينة" value={form.city} onChange={f("city")} placeholder="الرياض" />
            <Field label="رقم الهاتف" value={form.phone} onChange={f("phone")} placeholder="05xxxxxxxx" />
          </div>
          <Field label="العنوان التفصيلي" value={form.address} onChange={f("address")} placeholder="الحي، الشارع، رقم المبنى" />
          <Field label="مسؤول الفرع" value={form.manager_name} onChange={f("manager_name")} placeholder="اسم المسؤول" />
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-input bg-background/40 px-4 py-3">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
              className="accent-primary h-4 w-4"
            />
            <span className="text-sm font-medium">الفرع نشط</span>
          </label>
          <div className="flex gap-3 pt-1">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">
              {saving ? "جارٍ الحفظ…" : editOpen ? "حفظ التعديلات" : "إضافة الفرع"}
            </PrimaryButton>
            <button type="button" onClick={() => { setAddOpen(false); setEditOpen(null); }} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">
              إلغاء
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="حذف الفرع">
        <p className="mb-5 text-muted-foreground">
          هل أنت متأكد من حذف فرع <span className="font-bold text-foreground">«{delTarget?.name}»</span>؟ لا يمكن التراجع.
        </p>
        <div className="flex gap-3">
          <button onClick={confirmDelete} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white transition hover:bg-rose-600">
            نعم، احذف
          </button>
          <button onClick={() => setDelTarget(null)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">
            إلغاء
          </button>
        </div>
      </Modal>
    </div>
  );
}
