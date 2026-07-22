import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { BrainCircuit, RefreshCw, Bell, CheckCheck, Activity, Clock } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";

export default function AIMonitor() {
  const [status, setStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const timer = useRef(null);

  const loadStatus = useCallback(() => {
    api.get("/ai-monitor/status").then((r) => setStatus(r.data)).catch(() => {});
  }, []);
  const loadAlerts = useCallback(() => {
    api.get("/ai-monitor/alerts").then((r) => setAlerts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadStatus();
    loadAlerts();
    timer.current = setInterval(loadStatus, 10000);
    return () => clearInterval(timer.current);
  }, [loadStatus, loadAlerts]);

  const refresh = async () => {
    try {
      const { data } = await api.post("/ai-monitor/refresh");
      toast.success(data.message);
      loadStatus(); loadAlerts();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const markRead = async () => {
    await api.post("/ai-monitor/mark-read");
    loadAlerts();
    toast.success("تم تعليم الكل كمقروء");
  };

  const unread = alerts.filter((a) => !a.is_read).length;

  return (
    <div>
      <PageHeader title="المراقب الذكي" subtitle="ذكاء يراقب نشاط الموظفين 24/7 ويُنبّهك عند أي خلل" icon={BrainCircuit}>
        <button onClick={refresh} data-testid="ai-refresh" className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover"><RefreshCw className="h-4 w-4" /> تحديث يدوي</button>
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-3">
        <StatCard testId="ai-avg" label="متوسط الإنتاجية" value={status?.average_productivity != null ? `${status.average_productivity}%` : "لا توجد بيانات"} icon={Activity} accent="from-violet-500 to-fuchsia-500" />
        <StatCard label="الموظفون النشطون" value={status?.active_crew ?? "—"} icon={BrainCircuit} />
        <StatCard label="توقيت المراقب" value={status?.server_time || "—"} icon={Clock} sub={status?.after_hours ? "بعد ساعات العمل" : "ضمن الدوام"} accent="from-cyan-500 to-blue-500" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <h3 className="mb-3 font-display text-lg font-bold">تحليل الموظفين اللحظي</h3>
          <p className="mb-1 text-xs text-muted-foreground">الإنتاجية محسوبة من بيانات حقيقية: الحضور اليومي، إنجاز المهام هذا الشهر، ومدة الخمول — وليست عشوائية.</p>
          <p className="mb-4 rounded-xl bg-muted/60 p-3 text-sm">💡 {status?.recommendation}</p>
          <div className="space-y-2">
            {status?.crew?.map((c) => (
              <div key={c.id} className="rounded-xl border border-border p-3" data-testid={`ai-crew-${c.id}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold">{c.name}</span>
                  <span className={`text-xs ${c.checked_in_today ? "text-emerald-400" : "text-red-400"}`}>{c.checked_in_today ? "حاضر اليوم" : "لم يحضر"}</span>
                </div>
                {c.productivity != null ? (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full gradient-primary" style={{ width: `${c.productivity}%` }} />
                  </div>
                ) : (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted" />
                )}
                <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{c.productivity != null ? `إنتاجية ${c.productivity}%` : "لا توجد بيانات كافية"}</span>
                  <span>خمول {c.inactivity_minutes}د{c.flags_today > 0 ? ` · ${c.flags_today} تنبيه مشبوه` : ""}</span>
                </div>
              </div>
            ))}
            {(!status?.crew || status.crew.length === 0) && <p className="p-6 text-center text-sm text-muted-foreground">لا يوجد موظفون نشطون للمراقبة.</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold"><Bell className="h-5 w-5 text-amber-400" /> التنبيهات {unread > 0 && <span className="rounded-full bg-red-500 px-2 text-xs text-white">{unread}</span>}</h3>
            <button onClick={markRead} className="flex items-center gap-1 text-xs text-cyan-400" data-testid="mark-read"><CheckCheck className="h-4 w-4" /> تعليم مقروء</button>
          </div>
          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {alerts.map((a) => (
              <div key={a.id} className={`rounded-xl border-s-4 p-3 text-xs ${a.severity === "critical" ? "border-red-500 bg-red-500/10" : a.severity === "warning" ? "border-amber-400 bg-amber-400/10" : "border-blue-400 bg-blue-400/10"} ${a.is_read ? "opacity-60" : ""}`}>
                {a.message}
              </div>
            ))}
            {alerts.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد تنبيهات ✨</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
