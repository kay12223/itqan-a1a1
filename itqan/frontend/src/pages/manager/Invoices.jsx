import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText, Plus, Download, CheckCircle2, Clock, XCircle, DollarSign, Trash2, Eye,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton, StatCard } from "@/components/Kit";

const STATUS = {
  draft:   { label: "مسودة",  color: "text-slate-400  bg-slate-500/15",  icon: FileText },
  sent:    { label: "مُرسلة", color: "text-blue-400   bg-blue-500/15",   icon: Clock },
  paid:    { label: "مدفوعة", color: "text-emerald-400 bg-emerald-500/15",icon: CheckCircle2 },
  overdue: { label: "متأخرة", color: "text-rose-400   bg-rose-500/15",   icon: XCircle },
};

const EMPTY = { client_name: "", client_email: "", description: "", amount: "", currency: "EGP", due_date: "", notes: "" };

export default function Invoices() {
  const { company } = useAuth();
  const cur = company?.settings?.currency || "EGP";
  const [invoices, setInvoices] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(null);
  const [form, setForm] = useState({ ...EMPTY, currency: cur });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/invoices").then((r) => setInvoices(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    if (!form.client_name.trim() || !form.amount) { toast.error("اسم العميل والمبلغ مطلوبان"); return; }
    setSaving(true);
    try {
      await api.post("/invoices", { ...form, amount: Number(form.amount) });
      toast.success("تم إنشاء الفاتورة ✅");
      setAddOpen(false);
      setForm({ ...EMPTY, currency: cur });
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/invoices/${id}/status`, { status });
      toast.success("تم تحديث حالة الفاتورة");
      load();
      if (viewOpen?.id === id) setViewOpen((p) => ({ ...p, status }));
    } catch { toast.error("فشل التحديث"); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      toast.success("تم حذف الفاتورة");
      load();
    } catch { toast.error("فشل الحذف"); }
  };

  const total = invoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const pending = invoices.filter((i) => ["draft", "sent"].includes(i.status)).reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <PageHeader title="الفواتير" subtitle="فواتير احترافية جاهزة للإرسال" icon={FileText}>
        <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> فاتورة جديدة</PrimaryButton>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي الفواتير" value={invoices.length} icon={FileText} accent="from-blue-500 to-cyan-500" />
        <StatCard label="إجمالي المبلغ" value={`${total.toLocaleString()} ${cur}`} icon={DollarSign} accent="from-violet-500 to-purple-500" />
        <StatCard label="مدفوعة" value={`${paid.toLocaleString()} ${cur}`} icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
        <StatCard label="معلقة" value={`${pending.toLocaleString()} ${cur}`} icon={Clock} accent="from-amber-500 to-orange-500" />
      </div>

      {invoices.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد فواتير بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">أنشئ فاتورتك الأولى الآن</p>
          <PrimaryButton className="mt-5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> فاتورة جديدة</PrimaryButton>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv, i) => {
            const st = STATUS[inv.status] || STATUS.draft;
            const StIcon = st.icon;
            return (
              <GlassCard key={inv.id} hover delay={i * 0.03}>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{inv.client_name}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${st.color}`}>
                        <StIcon className="h-3 w-3" />{st.label}
                      </span>
                      <span className="text-xs text-muted-foreground">#{inv.invoice_number}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{inv.description}</p>
                    {inv.due_date && <p className="text-xs text-muted-foreground">الاستحقاق: {inv.due_date}</p>}
                  </div>
                  <div className="text-left">
                    <p className="font-display text-lg font-black gradient-text">{inv.amount?.toLocaleString()} {inv.currency}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setViewOpen(inv)} className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(inv.id)} className="rounded-lg p-2 text-rose-400 transition hover:bg-rose-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="فاتورة جديدة">
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم العميل *" value={form.client_name} onChange={f("client_name")} placeholder="شركة / شخص" required />
            <Field label="البريد الإلكتروني" type="email" value={form.client_email} onChange={f("client_email")} placeholder="client@email.com" />
          </div>
          <Field label="وصف الخدمة *" value={form.description} onChange={f("description")} placeholder="تصميم موقع، استشارة قانونية..." required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ *" type="number" value={form.amount} onChange={f("amount")} placeholder="0.00" required />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">العملة</span>
              <select value={form.currency} onChange={f("currency")} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none">
                {["EGP","SAR","AED","USD","EUR"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <Field label="تاريخ الاستحقاق" type="date" value={form.due_date} onChange={f("due_date")} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">ملاحظات</span>
            <textarea value={form.notes} onChange={f("notes")} rows={2} placeholder="شروط الدفع، تفاصيل إضافية..." className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none resize-none" />
          </label>
          <div className="flex gap-3 pt-1">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">{saving ? "جارٍ الإنشاء..." : "إنشاء الفاتورة"}</PrimaryButton>
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* View / status update modal */}
      <Modal open={!!viewOpen} onClose={() => setViewOpen(null)} title={`فاتورة #${viewOpen?.invoice_number || ""}`}>
        {viewOpen && (
          <div className="space-y-4">
            <div className="rounded-xl bg-muted/40 p-4 text-sm space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">العميل</span><span className="font-bold">{viewOpen.client_name}</span></div>
              {viewOpen.client_email && <div className="flex justify-between"><span className="text-muted-foreground">البريد</span><span>{viewOpen.client_email}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">الخدمة</span><span className="font-bold">{viewOpen.description}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">المبلغ</span><span className="font-display text-xl font-black gradient-text">{viewOpen.amount?.toLocaleString()} {viewOpen.currency}</span></div>
              {viewOpen.due_date && <div className="flex justify-between"><span className="text-muted-foreground">الاستحقاق</span><span>{viewOpen.due_date}</span></div>}
              {viewOpen.notes && <div className="flex justify-between"><span className="text-muted-foreground">ملاحظات</span><span>{viewOpen.notes}</span></div>}
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">تغيير الحالة</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(STATUS).map(([key, val]) => {
                  const Icon = val.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => updateStatus(viewOpen.id, key)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${viewOpen.status === key ? "border-primary/60 bg-primary/10" : "border-border hover:bg-white/5"}`}
                    >
                      <Icon className="h-4 w-4" />{val.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
