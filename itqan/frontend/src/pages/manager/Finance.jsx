import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Wallet, TrendingDown, TrendingUp, Boxes, Briefcase } from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, StatCard, GlassCard } from "@/components/Kit";

export default function Finance() {
  const [fin, setFin] = useState(null);
  const [tx, setTx] = useState([]);

  useEffect(() => {
    api.get("/finance/summary").then((r) => setFin(r.data)).catch(() => {});
    api.get("/transactions").then((r) => setTx(r.data)).catch(() => {});
  }, []);

  const fmt = (v) => `${(v || 0).toLocaleString()} $`;

  return (
    <div>
      <PageHeader title="المالية" subtitle="كل ما صُرف في الشركة: رواتب، خصومات، معدات ومهام" icon={Wallet} />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard testId="fin-salaries" label="إجمالي الرواتب" value={fmt(fin?.total_salaries)} icon={Wallet} />
        <StatCard testId="fin-deductions" label="إجمالي الخصومات" value={fmt(fin?.total_deductions)} icon={TrendingDown} accent="from-red-500 to-rose-500" />
        <StatCard testId="fin-additions" label="إجمالي الإضافات" value={fmt(fin?.total_additions)} icon={TrendingUp} accent="from-emerald-500 to-green-500" />
        <StatCard testId="fin-expenses" label="إجمالي المصروفات" value={fmt(fin?.total_expenses)} icon={Briefcase} accent="from-amber-500 to-orange-500" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="تكاليف المعدات" value={fmt(fin?.total_equipment)} icon={Boxes} accent="from-cyan-500 to-blue-500" />
        <StatCard label="مصاريف المهام" value={fmt(fin?.total_projects)} icon={Briefcase} accent="from-violet-500 to-fuchsia-500" />
        <StatCard label="صرف المديرين" value={fmt(fin?.total_manager_spending)} icon={TrendingUp} accent="from-pink-500 to-rose-500" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-bold">أداء الموظفين (نسبة الحضور)</h3>
          <div className="h-72" style={{ minHeight: 288 }}>
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={fin?.per_employee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="attendance_rate" name="نسبة الحضور %" radius={[8, 8, 0, 0]} fill="#22d3ee" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-bold">صافي رواتب الموظفين</h3>
          <div className="h-72" style={{ minHeight: 288 }}>
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={fin?.per_employee || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="salary" name="الراتب" stackId="a" fill="#3b82f6" />
                <Bar dataKey="additions" name="إضافات" stackId="a" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-5">
        <h3 className="mb-4 font-display text-lg font-bold">جدول الرواتب التفصيلي</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">العضو</th><th className="p-3">الراتب</th><th className="p-3">خصومات</th><th className="p-3">إضافات</th><th className="p-3">الصافي</th><th className="p-3">حضور</th>
              </tr>
            </thead>
            <tbody>
              {(fin?.per_employee || []).map((e) => (
                <tr key={e.id} className="border-b border-border/50">
                  <td className="p-3 font-bold">{e.name}</td>
                  <td className="p-3 font-mono-x">{e.salary.toLocaleString()}</td>
                  <td className="p-3 font-mono-x text-red-400">{e.deductions.toLocaleString()}</td>
                  <td className="p-3 font-mono-x text-emerald-400">{e.additions.toLocaleString()}</td>
                  <td className="p-3 font-mono-x font-bold gradient-text">{e.net.toLocaleString()}</td>
                  <td className="p-3 font-mono-x">{e.attendance_rate}%</td>
                </tr>
              ))}
              {(!fin?.per_employee || fin.per_employee.length === 0) && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">لا يوجد بيانات.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <GlassCard className="mt-5">
        <h3 className="mb-4 font-display text-lg font-bold">سجل العمليات المالية</h3>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {tx.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
              <div>
                <p className="font-bold">{t.user_name}</p>
                <p className="text-xs text-muted-foreground">{t.reason || "—"} · بواسطة {t.recorded_by_name}</p>
              </div>
              <span className={`font-mono-x font-bold ${t.type === "deduction" ? "text-red-400" : t.type === "addition" ? "text-emerald-400" : "text-cyan-400"}`}>
                {t.type === "deduction" ? "-" : t.type === "addition" ? "+" : "="} {t.amount.toLocaleString()} $
              </span>
            </div>
          ))}
          {tx.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">لا توجد عمليات مسجلة.</p>}
        </div>
      </GlassCard>
    </div>
  );
}
