import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard } from "@/components/Kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Landmark, CheckCircle2, XCircle, Clock, AlertTriangle, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const statusMap = {
  pending:  { label: "قيد المراجعة", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  approved: { label: "موافق عليه",   cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  rejected: { label: "مرفوض",        cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  paid:     { label: "مسدّد",        cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
};

export default function Loans() {
  const [loans, setLoans]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("all");
  const [rejectOpen, setRO]     = useState(false);
  const [rejectId, setRI]       = useState(null);
  const [rejectReason, setRR]   = useState("");
  const [acting, setActing]     = useState(null);

  const load = async () => {
    try { const { data } = await api.get("/loans"); setLoans(data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    setActing(id);
    try {
      await api.put(`/loans/${id}/approve`);
      toast.success("تم الموافقة على القرض وجدولة الخصومات");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "خطأ"); }
    finally { setActing(null); }
  };

  const reject = async () => {
    if (!rejectId) return;
    setActing(rejectId);
    try {
      await api.put(`/loans/${rejectId}/reject`, { reason: rejectReason });
      toast.success("تم رفض طلب القرض");
      setRO(false); setRR(""); setRI(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "خطأ"); }
    finally { setActing(null); }
  };

  const markPaid = async (id) => {
    setActing(id);
    try {
      await api.put(`/loans/${id}/pay-installment`);
      toast.success("تم تسجيل دفعة");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "خطأ"); }
    finally { setActing(null); }
  };

  const filtered = filter === "all" ? loans : loans.filter(l => l.status === filter);
  const pending  = loans.filter(l => l.status === "pending").length;
  const totalOut = loans.filter(l => l.status === "approved").reduce((s, l) => s + (l.remaining_amount || 0), 0);

  return (
    <div className="space-y-6 p-4 md:p-6" dir="rtl">
      <PageHeader title="إدارة قروض الموظفين" subtitle="راجع وافق أو ارفض طلبات القروض" icon={Landmark} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: "طلبات معلقة", value: pending, icon: Clock, color: "text-amber-400" },
          { label: "إجمالي القروض المعلقة", value: `${totalOut.toLocaleString()} ج.م`, icon: TrendingDown, color: "text-red-400" },
          { label: "إجمالي الطلبات", value: loans.length, icon: Landmark, color: "text-primary" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4 flex items-center gap-3">
            <s.icon className={`h-8 w-8 ${s.color} shrink-0`} />
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="font-bold text-lg">{s.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["all", "pending", "approved", "rejected", "paid"].map((f) => (
          <button key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${filter === f ? "gradient-primary text-white border-transparent" : "glass border-white/10 text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "الكل" : statusMap[f]?.label}
            {f === "pending" && pending > 0 && (
              <span className="mr-1.5 bg-amber-500 text-black rounded-full px-1.5 py-0.5 text-[10px]">{pending}</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">جارٍ التحميل...</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-10 text-center text-muted-foreground">
          <Landmark className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد قروض</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {filtered.map((loan) => {
            const s = statusMap[loan.status] || statusMap.pending;
            const pct = loan.total_amount > 0
              ? Math.round((1 - loan.remaining_amount / loan.total_amount) * 100) : 100;
            return (
              <GlassCard key={loan.id} className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold">{loan.employee_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{loan.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(loan.created_at), "d MMMM yyyy — HH:mm", { locale: ar })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>{s.label}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="glass rounded-xl p-2">
                    <p className="text-muted-foreground text-xs">القرض</p>
                    <p className="font-bold text-primary">{loan.total_amount?.toLocaleString()} ج.م</p>
                  </div>
                  <div className="glass rounded-xl p-2">
                    <p className="text-muted-foreground text-xs">المتبقي</p>
                    <p className="font-bold text-amber-400">{loan.remaining_amount?.toLocaleString()} ج.م</p>
                  </div>
                  <div className="glass rounded-xl p-2">
                    <p className="text-muted-foreground text-xs">القسط / شهر</p>
                    <p className="font-bold text-green-400">{loan.monthly_installment?.toLocaleString()} ج.م</p>
                  </div>
                </div>

                {loan.status === "approved" && loan.total_amount > 0 && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500"
                           style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-left">{pct}% مسدّد</p>
                  </div>
                )}

                {loan.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" onClick={() => approve(loan.id)} disabled={acting === loan.id}
                            className="gradient-primary text-white gap-1.5 flex-1">
                      <CheckCircle2 className="h-4 w-4" /> موافقة
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1 gap-1.5"
                            onClick={() => { setRI(loan.id); setRO(true); }} disabled={acting === loan.id}>
                      <XCircle className="h-4 w-4" /> رفض
                    </Button>
                  </div>
                )}

                {loan.status === "approved" && loan.remaining_amount > 0 && (
                  <Button size="sm" className="mt-3 w-full glass border border-white/10 text-sm"
                          onClick={() => markPaid(loan.id)} disabled={acting === loan.id}>
                    تسجيل دفعة شهرية ({loan.monthly_installment?.toLocaleString()} ج.م)
                  </Button>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRO}>
        <DialogContent dir="rtl" className="glass max-w-sm">
          <DialogHeader><DialogTitle>سبب الرفض</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Input placeholder="اكتب سبب الرفض (اختياري)" value={rejectReason}
                   onChange={(e) => setRR(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={reject} disabled={!!acting}>
                <XCircle className="h-4 w-4 ml-1" /> تأكيد الرفض
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setRO(false)}>إلغاء</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
