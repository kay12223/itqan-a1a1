import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import {
  Users, Wallet, BrainCircuit, TrendingUp, AlertTriangle, Crown, ArrowLeft, Boxes, Clock,
  CheckCircle2, XCircle, UserCheck,
} from "lucide-react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, StatCard, GlassCard } from "@/components/Kit";

const COLORS = ["#3b82f6", "#8b5cf6", "#22d3ee", "#f59e0b", "#ec4899"];

export default function ManagerDashboard() {
  const { company } = useAuth();
  const [fin, setFin] = useState(null);
  const [ai, setAi] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [pulse, setPulse] = useState(null);

  useEffect(() => {
    api.get("/finance/summary").then((r) => setFin(r.data)).catch(() => {});
    api.get("/ai-monitor/status").then((r) => setAi(r.data)).catch(() => {});
    api.get("/ai-monitor/alerts").then((r) => setAlerts(r.data)).catch(() => {});
    api.get("/team-pulse").then((r) => setPulse(r.data)).catch(() => {});
  }, []);

  const expenseData = [
    { name: "الرواتب", value: fin?.net_payroll || 0 },
    { name: "المعدات", value: fin?.total_equipment || 0 },
    { name: "المهام", value: fin?.total_projects || 0 },
  ];

  return (
    <div>
      <PageHeader title="مركز الادارة" subtitle={`أهلاً بقائد ${company?.name || ""}`} icon={TrendingUp}>
        {company?.is_premium ? (
          <span className="flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-sm font-bold text-white" data-testid="dashboard-premium">
            <Crown className="h-4 w-4" /> اشتراك مُفعّل
          </span>
        ) : (
          <Link to="/app/subscriptions" className="rounded-full glass px-4 py-2 text-sm font-bold card-hover">فعّل الاشتراك ✨</Link>
        )}
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard testId="stat-crew" label="الموظفون" value={fin?.crew_count ?? "—"} icon={Users} />
        <StatCard testId="stat-productivity" label="متوسط الإنتاجية" value={ai ? `${ai.average_productivity}%` : "—"} icon={BrainCircuit} accent="from-violet-500 to-fuchsia-500" />
        <StatCard testId="stat-payroll" label="صافي الرواتب" value={fin ? `${fin.net_payroll.toLocaleString()} ج.م` : "—"} icon={Wallet} accent="from-cyan-500 to-blue-500" />
        <StatCard testId="stat-attendance" label="نسبة الحضور" value={fin ? `${fin.attendance_rate ?? ai?.average_productivity ?? "—"}%` : "—"} icon={TrendingUp} accent="from-amber-500 to-orange-500" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 font-display text-lg font-bold">توزيع المصروفات</h3>
          <div className="h-64" style={{ minHeight: 256 }}>
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={expenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-bold">النِسب</h3>
          <div className="h-64" style={{ minHeight: 256 }}>
            <ResponsiveContainer width="100%" height={256}>
              <PieChart>
                <Pie data={expenseData.filter((d) => d.value > 0)} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={4}>
                  {expenseData.map((e, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">المراقب الذكي</h3>
            <Link to="/app/ai-monitor" className="flex items-center gap-1 text-sm text-cyan-400">عرض الكل <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          <p className="mb-3 rounded-xl bg-muted/60 p-3 text-sm">💡 {ai?.recommendation || "جارٍ التحليل..."}</p>
          <div className="space-y-2">
            {ai?.crew?.slice(0, 4).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                <span className="font-medium">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${c.checked_in_today ? "text-emerald-400" : "text-red-400"}`}>
                    {c.checked_in_today ? "حاضر" : "لم يحضر"}
                  </span>
                  <span className="font-mono-x text-sm gradient-text">{c.productivity}%</span>
                </div>
              </div>
            ))}
            {(!ai?.crew || ai.crew.length === 0) && <p className="text-sm text-muted-foreground">لا يوجد موظفون نشطون بعد. أضف موظفين من «إدارة الموظفين».</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">آخر التنبيهات</h3>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className={`rounded-xl border-s-4 p-3 text-xs ${a.severity === "critical" ? "border-red-500 bg-red-500/10" : a.severity === "warning" ? "border-amber-400 bg-amber-400/10" : "border-blue-400 bg-blue-400/10"}`}>
                {a.message}
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالياً ✨</p>}
          </div>
        </GlassCard>
      </div>

      {/* Team Pulse */}
      {pulse && (
        <div className="mt-5">
          <GlassCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">نبض الفريق اليومي</h3>
                <p className="text-xs text-muted-foreground">{pulse.date}</p>
              </div>
              <div className="flex gap-3 text-sm">
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> حضر: {pulse.present}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-rose-400">
                  <XCircle className="h-3.5 w-3.5" /> غائب: {pulse.absent}
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> يحتاج متابعة: {pulse.needs_followup}
                </span>
              </div>
            </div>

            {pulse.members.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا يوجد موظفون بعد. أضف موظفين من «إدارة الموظفين».</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pulse.members.slice(0, 9).map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 ${
                      m.status === "absent"
                        ? "border-rose-500/30 bg-rose-500/5"
                        : m.late_tasks > 0
                        ? "border-amber-500/30 bg-amber-500/5"
                        : "border-emerald-500/20 bg-emerald-500/5"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${
                      m.status === "absent" ? "bg-rose-500" : m.status === "done" ? "bg-slate-500" : "bg-emerald-500"
                    }`}>
                      {m.name?.[0] || "؟"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.job_title || "موظف"}</p>
                    </div>
                    <div className="text-left">
                      {m.status === "absent" && <span className="text-[11px] font-bold text-rose-400">غائب</span>}
                      {m.status === "present" && <span className="text-[11px] font-bold text-emerald-400">حاضر</span>}
                      {m.status === "done" && <span className="text-[11px] font-bold text-slate-400">انصرف</span>}
                      {m.late_tasks > 0 && (
                        <p className="text-[11px] text-amber-400">{m.late_tasks} مهمة</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pulse.members.length > 9 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                +{pulse.members.length - 9} موظف آخر —{" "}
                <Link to="/app/live-monitor" className="text-cyan-400 hover:underline">عرض الكل</Link>
              </p>
            )}
          </GlassCard>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { to: "/app/crew", icon: Users, label: "إضافة موظف" },
          { to: "/app/attendance", icon: Clock, label: "إعداد الحضور" },
          { to: "/app/operations", icon: Boxes, label: "إضافة مهمة" },
          { to: "/app/subscriptions", icon: Crown, label: "محرك الفراغ" },
        ].map((q) => (
          <Link key={q.to} to={q.to} className="flex flex-col items-center gap-2 rounded-2xl glass p-5 text-center card-hover">
            <q.icon className="h-6 w-6 text-cyan-400" />
            <span className="text-sm font-bold">{q.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
