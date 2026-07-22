import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard } from "@/components/Kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Landmark, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusMap = {
  pending:  { label: "قيد المراجعة", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: Clock },
  approved: { label: "موافق عليه", color: "bg-green-500/15 text-green-400 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "مرفوض", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: XCircle },
  paid:     { label: "مسدّد بالكامل", color: "bg-blue-500/15 text-blue-400 border-blue-500/30", icon: CheckCircle2 },
};

export default function MyLoans() {
  const [loans, setLoans]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const [form, setForm]       = useState({ amount: "", reason: "", repayment_months: "3" });
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/loans");
      setLoans(data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.amount || !form.reason) { toast.error("أكمل البيانات"); return; }
    setSaving(true);
    try {
      await api.post("/loans", {
        amount: Number(form.amount),
        reason: form.reason,
        repayment_months: Number(form.repayment_months),
      });
      toast.success("تم إرسال طلب القرض");
      setOpen(false);
      setForm({ amount: "", reason: "", repayment_months: "3" });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "حدث خطأ");
    } finally { setSaving(false); }
  };

  const totalLoan = loans.reduce((s, l) => l.status === "approved" ? s + l.remaining_amount : s, 0);

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <PageHeader
        title="قروضي"
        subtitle="اطلب قرضاً من المدير ويتم خصمه تلقائياً من راتبك"
        icon={Landmark}
      >
        <Button onClick={() => setOpen(true)} className="gradient-primary text-white gap-2">
          <Plus className="h-4 w-4" /> طلب قرض جديد
        </Button>
      </PageHeader>

      {/* Summary */}
      {totalLoan > 0 && (
        <GlassCard className="p-4 flex items-center gap-3 border-amber-500/30">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
          <span className="text-sm text-amber-300">
            إجمالي ما تبقى من قروض: <strong>{totalLoan.toLocaleString()} ج.م</strong> — يتم خصمها تلقائياً من راتبك
          </span>
        </GlassCard>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">جارٍ التحميل...</div>
      ) : loans.length === 0 ? (
        <GlassCard className="p-10 text-center text-muted-foreground">
          <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد قروض حتى الآن</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {loans.map((loan) => {
            const s = statusMap[loan.status] || statusMap.pending;
            const Icon = s.icon;
            const pct = loan.total_amount > 0 ? Math.round((1 - loan.remaining_amount / loan.total_amount) * 100) : 100;
            return (
              <GlassCard key={loan.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-base">{loan.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(loan.created_at), "d MMMM yyyy", { locale: ar })}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
                    <Icon className="h-3 w-3" /> {s.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="glass rounded-xl p-3">
                    <p className="text-muted-foreground text-xs">إجمالي القرض</p>
                    <p className="font-bold text-primary mt-1">{loan.total_amount?.toLocaleString()} ج.م</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-muted-foreground text-xs">المتبقي</p>
                    <p className="font-bold text-amber-400 mt-1">{loan.remaining_amount?.toLocaleString()} ج.م</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <p className="text-muted-foreground text-xs">القسط الشهري</p>
                    <p className="font-bold text-green-400 mt-1">{loan.monthly_installment?.toLocaleString()} ج.م</p>
                  </div>
                </div>

                {loan.status === "approved" && loan.total_amount > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>نسبة السداد</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                           style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {loan.status === "rejected" && loan.reject_reason && (
                  <p className="mt-3 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
                    سبب الرفض: {loan.reject_reason}
                  </p>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Request dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="glass max-w-sm">
          <DialogHeader>
            <DialogTitle>طلب قرض جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">مبلغ القرض (ج.م)</label>
              <Input type="number" placeholder="1000" value={form.amount}
                     onChange={(e) => setForm(f => ({...f, amount: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">سبب القرض</label>
              <Textarea placeholder="اشرح سبب احتياجك للقرض..." rows={3} value={form.reason}
                        onChange={(e) => setForm(f => ({...f, reason: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">عدد أشهر السداد</label>
              <select className="w-full glass rounded-xl px-3 py-2.5 text-sm border border-white/10 bg-transparent"
                      value={form.repayment_months}
                      onChange={(e) => setForm(f => ({...f, repayment_months: e.target.value}))}>
                {[1,2,3,4,5,6].map(m => (
                  <option key={m} value={m}>{m} {m === 1 ? "شهر" : "أشهر"}</option>
                ))}
              </select>
            </div>
            {form.amount && form.repayment_months && (
              <p className="text-xs text-muted-foreground bg-white/5 rounded-lg px-3 py-2">
                القسط الشهري التقريبي:{" "}
                <strong className="text-primary">
                  {Math.ceil(Number(form.amount) / Number(form.repayment_months)).toLocaleString()} ج.م / شهر
                </strong>
              </p>
            )}
            <Button onClick={submit} disabled={saving} className="w-full gradient-primary text-white">
              {saving ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
