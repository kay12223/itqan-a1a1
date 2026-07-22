import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

const TYPES = {
  debt:      { label: "دَيْن",         color: "text-red-400",    bg: "bg-red-400/10 border-red-400/30" },
  deduction: { label: "خصم",           color: "text-amber-400",  bg: "bg-amber-400/10 border-amber-400/30" },
  advance:   { label: "عربون / مقدمة", color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/30" },
  need:      { label: "احتياج",        color: "text-cyan-400",   bg: "bg-cyan-400/10 border-cyan-400/30" },
};

const EMPTY = { record_type: "debt", amount: "", description: "", person_name: "", due_date: "", note: "", status: "active" };

export default function ManagerRecords() {
  const [items, setItems]   = useState([]);
  const [open, setOpen]     = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [activeType, setActiveType] = useState("all");

  const load = () => api.get("/manager-records").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditItem(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (item) => {
    setEditItem(item);
    setForm({ record_type: item.record_type, amount: item.amount, description: item.description,
              person_name: item.person_name, due_date: item.due_date || "", note: item.note, status: item.status });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editItem) { await api.put(`/manager-records/${editItem.id}`, payload); toast.success("تم التحديث"); }
      else          { await api.post("/manager-records", payload); toast.success("تم الإضافة"); }
      setOpen(false); load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const settle = async (id) => {
    try {
      const item = items.find(i => i.id === id);
      await api.put(`/manager-records/${id}`, { ...item, amount: item.amount, status: "settled" });
      toast.success("تم تسوية السجل"); load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/manager-records/${id}`); toast.success("تم الحذف"); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const filtered = activeType === "all" ? items : items.filter(i => i.record_type === activeType);
  const activeTotal = items.filter(i => i.status === "active").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageHeader title="سجلات المدير" subtitle="ديون — خصومات — عربون — احتياجات" icon={BookOpen}>
        <PrimaryButton onClick={openAdd}><Plus className="h-4 w-4" /> إضافة سجل</PrimaryButton>
      </PageHeader>

      {/* Type filter tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[["all", "الكل", ""], ...Object.entries(TYPES).map(([k, v]) => [k, v.label, v.color])].map(([key, label]) => (
          <button key={key} onClick={() => setActiveType(key)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${activeType === key ? "gradient-primary text-white" : "glass text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
        <span className="ms-auto text-xs text-muted-foreground">
          إجمالي النشط: <strong className="text-amber-400">{activeTotal.toLocaleString()} ج.م</strong>
        </span>
      </div>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">النوع</th><th className="p-3">الوصف</th><th className="p-3">الشخص</th>
                <th className="p-3">المبلغ</th><th className="p-3">تاريخ الاستحقاق</th>
                <th className="p-3">الحالة</th><th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const t = TYPES[item.record_type] || {};
                return (
                  <tr key={item.id} className={`border-b border-border/50 ${item.status === "settled" ? "opacity-50" : ""}`}>
                    <td className="p-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${t.bg} ${t.color}`}>
                        {t.label}
                      </span>
                    </td>
                    <td className="p-3 font-medium">{item.description}</td>
                    <td className="p-3 text-muted-foreground">{item.person_name || "—"}</td>
                    <td className={`p-3 font-bold ${t.color}`}>{item.amount.toLocaleString()} ج.م</td>
                    <td className="p-3 text-xs text-muted-foreground">{item.due_date || "—"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${item.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                        {item.status === "active" ? "نشط" : "مُسوَّى"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {item.status === "active" && (
                          <button onClick={() => settle(item.id)} title="تسوية"
                            className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 hover:bg-emerald-500/25">
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => openEdit(item)}
                          className="rounded-lg p-1.5 text-cyan-400 hover:bg-muted">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => remove(item.id)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-muted">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد سجلات.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal open={open} onClose={() => setOpen(false)} title={editItem ? "تعديل السجل" : "إضافة سجل جديد"}>
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">نوع السجل</span>
            <select value={form.record_type} onChange={e => F("record_type", e.target.value)}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </label>
          <Field label="الوصف" value={form.description} onChange={e => F("description", e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ (ج.م)" type="number" min="0" value={form.amount}
              onChange={e => F("amount", e.target.value)} required />
            <Field label="اسم الشخص (اختياري)" value={form.person_name}
              onChange={e => F("person_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الاستحقاق (اختياري)" type="date" value={form.due_date}
              onChange={e => F("due_date", e.target.value)} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">الحالة</span>
              <select value={form.status} onChange={e => F("status", e.target.value)}
                className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
                <option value="active">نشط</option>
                <option value="settled">مُسوَّى</option>
              </select>
            </label>
          </div>
          <Field label="ملاحظة (اختياري)" value={form.note} onChange={e => F("note", e.target.value)} />
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? "جارٍ الحفظ..." : editItem ? "تحديث" : "إضافة"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
