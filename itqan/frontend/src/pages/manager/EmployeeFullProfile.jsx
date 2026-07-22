import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User, ArrowRight, Calendar, Wallet, CreditCard, CalendarClock,
  Clock, TrendingDown, TrendingUp, Shield, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import api from "@/lib/apiClient";
import { GlassCard, PageHeader } from "@/components/Kit";
import { formatTime12h } from "@/lib/utils";

const LEAVE_TYPES = { annual: "سنوية", sick: "مرضية", mission: "مأمورية", other: "أخرى" };
const ATT_BADGE = {
  present: { label: "حضور",   cls: "bg-emerald-500/15 text-emerald-400" },
  late:    { label: "متأخر",  cls: "bg-amber-400/15 text-amber-400" },
  absence: { label: "غياب",   cls: "bg-red-500/15 text-red-400" },
};

function StatMini({ label, value, icon: Icon, color = "text-cyan-400" }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
      <Icon className={`mx-auto mb-1 h-5 w-5 ${color}`} />
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default function EmployeeFullProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]   = useState(null);
  const [tab, setTab]     = useState("attendance");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/crew/${id}/full-profile`).then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-12 text-center text-muted-foreground">جارٍ التحميل...</div>;
  if (!data)   return <div className="p-12 text-center text-red-400">الموظف غير موجود.</div>;

  const { employee: emp, attendance: att, transactions, loans, leaves, late_permissions } = data;
  const TABS = [
    { key: "attendance", label: "الحضور",         icon: Calendar },
    { key: "transactions", label: "المعاملات المالية", icon: Wallet },
    { key: "loans",      label: "القروض",          icon: CreditCard },
    { key: "leaves",     label: "الإجازات",        icon: CalendarClock },
    { key: "late",       label: "استئذان التأخير", icon: Clock },
  ];

  return (
    <div>
      <PageHeader title="ملف الموظف الكامل" subtitle={emp.name} icon={User}>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl glass px-4 py-2 text-sm card-hover">
          <ArrowRight className="h-4 w-4" /> رجوع
        </button>
      </PageHeader>

      {/* Employee summary card */}
      <GlassCard className="mb-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full gradient-primary text-3xl font-black text-white">
            {emp.avatar_url ? <img src={emp.avatar_url} alt="" className="h-full w-full object-cover" /> : emp.name?.[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black">{emp.name}</h2>
            <p className="text-muted-foreground">{emp.job_title || "موظف"}</p>
            {emp.phone && <p className="mt-1 text-xs text-muted-foreground">📞 {emp.phone}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatMini label="الراتب الأساسي"   value={`${(emp.monthly_salary||0).toLocaleString()} ج.م`} icon={Wallet} />
            <StatMini label="نسبة الحضور"      value={`${att.attendance_rate}%`} icon={CheckCircle2} color="text-emerald-400" />
            <StatMini label="إجمالي الخصومات" value={`${(emp.total_deductions||0).toLocaleString()}`} icon={TrendingDown} color="text-red-400" />
            <StatMini label="إجمالي الإضافات" value={`${(emp.total_additions||0).toLocaleString()}`} icon={TrendingUp} color="text-emerald-400" />
          </div>
        </div>
      </GlassCard>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
          <p className="text-2xl font-black text-emerald-400">{att.present_days}</p>
          <p className="text-xs text-muted-foreground">يوم حضور</p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-center">
          <p className="text-2xl font-black text-amber-400">{att.late_days}</p>
          <p className="text-xs text-muted-foreground">يوم تأخير</p>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center">
          <p className="text-2xl font-black text-red-400">{att.absent_days}</p>
          <p className="text-xs text-muted-foreground">يوم غياب</p>
        </div>
        <div className="rounded-2xl border border-border bg-muted/30 p-4 text-center">
          <p className="text-2xl font-black gradient-text">{att.total_days}</p>
          <p className="text-xs text-muted-foreground">إجمالي السجلات</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === t.key ? "gradient-primary text-white" : "glass text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      <GlassCard>
        {/* Attendance tab */}
        {tab === "attendance" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">التاريخ</th><th className="p-3">النوع</th>
                <th className="p-3">وقت الحضور</th><th className="p-3">الخصم</th>
              </tr></thead>
              <tbody>
                {att.logs.map(l => (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="p-3 font-mono text-xs">{l.log_date}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${ATT_BADGE[l.type]?.cls}`}>{ATT_BADGE[l.type]?.label || l.type}</span></td>
                    <td className="p-3 font-mono text-muted-foreground">{formatTime12h(l.check_time)}</td>
                    <td className={`p-3 font-bold ${l.deduction_amount > 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {l.deduction_amount > 0 ? `-${l.deduction_amount} ج.م` : "—"}
                    </td>
                  </tr>
                ))}
                {att.logs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد سجلات.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions tab */}
        {tab === "transactions" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">النوع</th><th className="p-3">المبلغ</th><th className="p-3">السبب</th><th className="p-3">التاريخ</th>
              </tr></thead>
              <tbody>
                {transactions.map(t => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${t.type === "deduction" ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"}`}>{t.type === "deduction" ? "خصم" : "إضافة"}</span></td>
                    <td className={`p-3 font-bold ${t.type === "deduction" ? "text-red-400" : "text-emerald-400"}`}>{t.amount} ج.م</td>
                    <td className="p-3 text-muted-foreground">{t.reason || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{t.created_at ? new Date(t.created_at).toLocaleDateString("ar-EG") : "—"}</td>
                  </tr>
                ))}
                {transactions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد معاملات.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Loans tab */}
        {tab === "loans" && (
          <div className="space-y-3">
            {loans.map(l => (
              <div key={l.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{l.reason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      المبلغ الكلي: {l.amount} ج.م | المتبقي: <span className={l.remaining_amount > 0 ? "text-amber-400" : "text-emerald-400"}>{l.remaining_amount} ج.م</span>
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${l.status === "paid" ? "bg-emerald-500/15 text-emerald-400" : l.status === "approved" ? "bg-cyan-500/15 text-cyan-400" : "bg-amber-400/15 text-amber-400"}`}>
                    {l.status === "paid" ? "مسدَّد" : l.status === "approved" ? "نشط" : "بانتظار الموافقة"}
                  </span>
                </div>
              </div>
            ))}
            {loans.length === 0 && <p className="p-8 text-center text-muted-foreground">لا توجد قروض.</p>}
          </div>
        )}

        {/* Leaves tab */}
        {tab === "leaves" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">النوع</th><th className="p-3">من</th><th className="p-3">إلى</th><th className="p-3">السبب</th><th className="p-3">الحالة</th>
              </tr></thead>
              <tbody>
                {leaves.map(l => (
                  <tr key={l.id} className="border-b border-border/50">
                    <td className="p-3">{LEAVE_TYPES[l.leave_type] || l.leave_type}</td>
                    <td className="p-3 font-mono text-xs">{l.start_date}</td>
                    <td className="p-3 font-mono text-xs">{l.end_date}</td>
                    <td className="p-3 text-muted-foreground">{l.reason || "—"}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${l.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : l.status === "rejected" ? "bg-red-500/15 text-red-400" : "bg-amber-400/15 text-amber-400"}`}>{l.status === "approved" ? "مقبولة" : l.status === "rejected" ? "مرفوضة" : "بانتظار"}</span></td>
                  </tr>
                ))}
                {leaves.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد إجازات.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* Late permissions tab */}
        {tab === "late" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">السبب</th><th className="p-3">الوقت المتوقع</th><th className="p-3">الحالة</th><th className="p-3">التاريخ</th>
              </tr></thead>
              <tbody>
                {late_permissions.map(p => (
                  <tr key={p.id} className="border-b border-border/50">
                    <td className="p-3">{p.reason}</td>
                    <td className="p-3 font-mono text-muted-foreground">{p.expected_time || "—"}</td>
                    <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "approved" ? "bg-emerald-500/15 text-emerald-400" : p.status === "rejected" ? "bg-red-500/15 text-red-400" : "bg-amber-400/15 text-amber-400"}`}>{p.status === "approved" ? "مقبول" : p.status === "rejected" ? "مرفوض" : "بانتظار"}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{p.created_at ? new Date(p.created_at).toLocaleDateString("ar-EG") : "—"}</td>
                  </tr>
                ))}
                {late_permissions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد سجلات.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
