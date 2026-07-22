import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus, Check, X, Trash2 } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

const TYPES = { annual: "سنوية", sick: "مرضية", mission: "مأمورية", other: "أخرى" };
const STATUS = {
  pending: { label: "بانتظار", cls: "bg-amber-400/15 text-amber-400" },
  approved: { label: "مقبولة", cls: "bg-emerald-500/15 text-emerald-400" },
  rejected: { label: "مرفوضة", cls: "bg-red-500/15 text-red-400" },
};

export default function Leaves() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/leaves").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/leaves", form);
      toast.success(isManager ? "تم تسجيل الإجازة" : "تم إرسال الطلب — بانتظار اعتماد المدير");
      setOpen(false); setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" }); load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };
  const decide = async (id, status) => { await api.post(`/leaves/${id}/decision`, { status }); load(); };
  const remove = async (id) => { await api.delete(`/leaves/${id}`); load(); };

  return (
    <div>
      <PageHeader title="الإجازات" subtitle={isManager ? "راجع واعتمد طلبات إجازات الموظفين" : "اطلب إجازتك وتابع حالتها"} icon={CalendarClock}>
        <PrimaryButton onClick={() => setOpen(true)} data-testid="add-leave-btn"><Plus className="h-4 w-4" /> {isManager ? "تسجيل إجازة" : "طلب إجازة"}</PrimaryButton>
      </PageHeader>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="leaves-table">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                {isManager && <th className="p-3">العضو</th>}
                <th className="p-3">النوع</th><th className="p-3">من</th><th className="p-3">إلى</th><th className="p-3">السبب</th><th className="p-3">الحالة</th><th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-b border-border/50" data-testid={`leave-${l.id}`}>
                  {isManager && <td className="p-3 font-bold">{l.user_name}</td>}
                  <td className="p-3">{TYPES[l.leave_type] || l.leave_type}</td>
                  <td className="p-3 font-mono-x text-muted-foreground">{l.start_date}</td>
                  <td className="p-3 font-mono-x text-muted-foreground">{l.end_date}</td>
                  <td className="p-3 text-muted-foreground">{l.reason || "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[l.status]?.cls}`}>{STATUS[l.status]?.label}</span></td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {isManager && l.status === "pending" && (
                        <>
                          <button onClick={() => decide(l.id, "approved")} className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400" data-testid={`approve-leave-${l.id}`}><Check className="h-4 w-4" /></button>
                          <button onClick={() => decide(l.id, "rejected")} className="rounded-lg bg-red-500/15 p-1.5 text-red-400" data-testid={`reject-leave-${l.id}`}><X className="h-4 w-4" /></button>
                        </>
                      )}
                      {(isManager || l.status === "pending") && (
                        <button onClick={() => remove(l.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={isManager ? 7 : 6} className="p-8 text-center text-muted-foreground">لا توجد طلبات إجازة.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal open={open} onClose={() => setOpen(false)} title="طلب إجازة" testId="leave-modal">
        <form onSubmit={add} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">نوع الإجازة</span>
            <select value={form.leave_type} onChange={(e) => setForm({ ...form, leave_type: e.target.value })} data-testid="leave-type"
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
              {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="من تاريخ" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required data-testid="leave-start" />
            <Field label="إلى تاريخ" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required data-testid="leave-end" />
          </div>
          <Field label="السبب" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="leave-submit">{saving ? "جارٍ..." : "إرسال"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
