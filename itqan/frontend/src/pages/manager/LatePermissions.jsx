import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, Plus, Check, X, Trash2 } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

const STATUS = {
  pending:  { label: "بانتظار القرار", cls: "bg-amber-400/15 text-amber-400" },
  approved: { label: "مقبول",          cls: "bg-emerald-500/15 text-emerald-400" },
  rejected: { label: "مرفوض",          cls: "bg-red-500/15 text-red-400" },
};

export default function LatePermissions() {
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "co_manager";
  const [items, setItems]   = useState([]);
  const [open, setOpen]     = useState(false);
  const [form, setForm]     = useState({ reason: "", expected_time: "" });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/late-permissions").then(r => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/late-permissions", form);
      toast.success("تم إرسال طلب الاستئذان — بانتظار موافقة المدير");
      setOpen(false); setForm({ reason: "", expected_time: "" }); load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const decide = async (id, status) => {
    try { await api.post(`/late-permissions/${id}/decision`, { status }); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/late-permissions/${id}`); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader
        title="استئذان التأخير"
        subtitle={isManager ? "راجع وأقرّ طلبات الاستئذان" : "أرسل طلب استئذان وتابع قراره"}
        icon={Clock}
      >
        <PrimaryButton onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> طلب استئذان
        </PrimaryButton>
      </PageHeader>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                {isManager && <th className="p-3">الموظف</th>}
                <th className="p-3">السبب</th>
                <th className="p-3">وقت الحضور المتوقع</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-border/50">
                  {isManager && <td className="p-3 font-bold">{item.user_name}</td>}
                  <td className="p-3">{item.reason}</td>
                  <td className="p-3 font-mono text-muted-foreground">{item.expected_time || "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[item.status]?.cls}`}>
                      {STATUS[item.status]?.label}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {isManager && item.status === "pending" && (
                        <>
                          <button onClick={() => decide(item.id, "approved")}
                            className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 hover:bg-emerald-500/25">
                            <Check className="h-4 w-4" />
                          </button>
                          <button onClick={() => decide(item.id, "rejected")}
                            className="rounded-lg bg-red-500/15 p-1.5 text-red-400 hover:bg-red-500/25">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      {(isManager || item.status === "pending") && (
                        <button onClick={() => remove(item.id)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-muted">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={isManager ? 5 : 4} className="p-8 text-center text-muted-foreground">
                  لا توجد طلبات استئذان.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal open={open} onClose={() => setOpen(false)} title="طلب استئذان تأخير">
        <form onSubmit={submit} className="space-y-4">
          <Field label="سبب التأخير" value={form.reason}
            onChange={e => setForm({ ...form, reason: e.target.value })} required />
          <Field label="وقت الحضور المتوقع (اختياري)" type="time" value={form.expected_time}
            onChange={e => setForm({ ...form, expected_time: e.target.value })} />
          <PrimaryButton type="submit" disabled={saving} className="w-full">
            {saving ? "جارٍ الإرسال..." : "إرسال الطلب"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
