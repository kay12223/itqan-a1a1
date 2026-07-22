import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Vault, Plus, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard, Modal, Field, PrimaryButton } from "@/components/Kit";

const EMPTY = { op_type: "fund", amount: "", description: "", category: "" };

export default function PettyCash() {
  const [data, setData]     = useState({ balance: 0, operations: [] });
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = () => api.get("/petty-cash").then(r => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/petty-cash", { ...form, amount: Number(form.amount) });
      toast.success(form.op_type === "fund" ? "تم إيداع المبلغ في الخزينة" : "تم تسجيل الصرف");
      setOpen(false); setForm(EMPTY); load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await api.delete(`/petty-cash/${id}`); toast.success("تم الحذف"); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const ops = filter === "all" ? data.operations
    : data.operations.filter(o => o.op_type === filter);

  const totalFund  = data.operations.filter(o => o.op_type === "fund").reduce((s, o) => s + o.amount, 0);
  const totalSpend = data.operations.filter(o => o.op_type === "spend").reduce((s, o) => s + o.amount, 0);

  return (
    <div>
      <PageHeader title="الخزينة / المخزن" subtitle="تتبع رصيد الخزينة والمصروفات اليومية" icon={Vault}>
        <PrimaryButton onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> إضافة عملية
        </PrimaryButton>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="الرصيد الحالي" value={`${data.balance.toLocaleString()} ج.م`}
          icon={Vault} accent="from-cyan-500 to-blue-500" />
        <StatCard label="إجمالي الإيداع" value={`${totalFund.toLocaleString()} ج.م`}
          icon={TrendingUp} accent="from-emerald-500 to-green-500" />
        <StatCard label="إجمالي الصرف" value={`${totalSpend.toLocaleString()} ج.م`}
          icon={TrendingDown} accent="from-red-500 to-rose-500" />
      </div>

      <GlassCard>
        <div className="mb-4 flex items-center gap-2">
          {["all", "fund", "spend"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${filter === f ? "gradient-primary text-white" : "glass text-muted-foreground hover:text-foreground"}`}>
              {f === "all" ? "الكل" : f === "fund" ? "إيداع" : "صرف"}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">النوع</th><th className="p-3">المبلغ</th>
                <th className="p-3">البيان</th><th className="p-3">الفئة</th>
                <th className="p-3">بواسطة</th><th className="p-3">التاريخ</th>
                <th className="p-3">حذف</th>
              </tr>
            </thead>
            <tbody>
              {ops.map(op => (
                <tr key={op.id} className="border-b border-border/50">
                  <td className="p-3">
                    <span className={`flex items-center gap-1 text-xs font-bold ${op.op_type === "fund" ? "text-emerald-400" : "text-red-400"}`}>
                      {op.op_type === "fund" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {op.op_type === "fund" ? "إيداع" : "صرف"}
                    </span>
                  </td>
                  <td className={`p-3 font-bold ${op.op_type === "fund" ? "text-emerald-400" : "text-red-400"}`}>
                    {op.op_type === "fund" ? "+" : "-"}{op.amount.toLocaleString()} ج.م
                  </td>
                  <td className="p-3">{op.description}</td>
                  <td className="p-3 text-muted-foreground">{op.category || "—"}</td>
                  <td className="p-3 text-muted-foreground">{op.created_by || "—"}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(op.created_at).toLocaleDateString("ar-EG")}
                  </td>
                  <td className="p-3">
                    <button onClick={() => remove(op.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-muted">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {ops.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد عمليات.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal open={open} onClose={() => setOpen(false)} title="إضافة عملية خزينة">
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">نوع العملية</span>
            <select value={form.op_type} onChange={e => F("op_type", e.target.value)}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
              <option value="fund">إيداع / تعبئة الخزينة</option>
              <option value="spend">صرف / مصروف</option>
            </select>
          </label>
          <Field label="المبلغ (ج.م)" type="number" min="0" value={form.amount}
            onChange={e => F("amount", e.target.value)} required />
          <Field label="البيان / الوصف" value={form.description}
            onChange={e => F("description", e.target.value)} required />
          <Field label="الفئة (اختياري)" value={form.category}
            onChange={e => F("category", e.target.value)} placeholder="مثال: مواد خام، كهرباء..." />
          {form.op_type === "spend" && data.balance > 0 && (
            <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
              💡 الرصيد الحالي: <strong className="text-cyan-400">{data.balance.toLocaleString()} ج.م</strong>
            </p>
          )}
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? "جارٍ الحفظ..." : form.op_type === "fund" ? "إيداع" : "تسجيل الصرف"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
