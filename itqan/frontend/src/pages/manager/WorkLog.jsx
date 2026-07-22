import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { NotebookPen, CheckCircle2, Clock, Trash2, Check } from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";

export default function WorkLog() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    api.get(`/work-logs?month=${month}`).then((r) => setLogs(r.data)).catch(() => {});
    api.get(`/work-logs/summary?month=${month}`).then((r) => setSummary(r.data)).catch(() => {});
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const approve = async (id) => { await api.post(`/work-logs/${id}/approve`); toast.success("تم الاعتماد"); load(); };
  const remove = async (id) => { await api.delete(`/work-logs/${id}`); load(); };

  const shown = logs.filter((l) => filter === "all" || l.status === filter);
  const pending = logs.filter((l) => l.status === "pending").length;

  return (
    <div>
      <PageHeader title="دفتر الأعمال" subtitle="راجع واعتمد ما أنجزه الموظفون — كشف شهري بكل الأعمال وقيمتها" icon={NotebookPen}>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="month-picker"
          className="rounded-xl border border-input bg-background/60 px-3 py-2 text-sm" />
      </PageHeader>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الأعمال" value={summary?.total_jobs ?? 0} icon={NotebookPen} />
        <StatCard label="بانتظار الاعتماد" value={pending} icon={Clock} accent="from-amber-500 to-orange-500" />
        <StatCard label="إجمالي القيمة المعتمدة" value={`${(summary?.grand_total || 0).toLocaleString()} $`} icon={CheckCircle2} accent="from-emerald-500 to-green-500" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">سجل الأعمال</h3>
            <div className="flex gap-1 rounded-xl bg-muted p-1 text-xs">
              {[["all", "الكل"], ["pending", "بانتظار"], ["approved", "معتمد"]].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1 ${filter === k ? "gradient-primary text-white" : ""}`} data-testid={`filter-${k}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {shown.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-border p-3" data-testid={`worklog-${l.id}`}>
                <div>
                  <p className="font-bold">{l.description}</p>
                  <p className="text-xs text-muted-foreground font-mono-x">{l.user_name} · {l.work_date} · {l.price.toLocaleString()} $</p>
                </div>
                <div className="flex items-center gap-2">
                  {l.status === "approved" ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-4 w-4" /> معتمد</span>
                  ) : (
                    <button onClick={() => approve(l.id)} className="flex items-center gap-1 rounded-lg gradient-primary px-3 py-1.5 text-xs font-bold text-white" data-testid={`approve-${l.id}`}><Check className="h-3.5 w-3.5" /> اعتماد</button>
                  )}
                  <button onClick={() => remove(l.id)} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
            {shown.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد أعمال في هذا الشهر.</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-bold">كشف الموظفين الشهري</h3>
          <div className="space-y-2">
            {summary?.per_employee?.map((e, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3">
                <div>
                  <p className="font-bold">{e.user_name}</p>
                  <p className="text-xs text-muted-foreground">{e.count} عمل معتمد</p>
                </div>
                <span className="font-mono-x font-bold gradient-text">{e.total.toLocaleString()} $</span>
              </div>
            ))}
            {(!summary?.per_employee || summary.per_employee.length === 0) && <p className="p-6 text-center text-sm text-muted-foreground">لا يوجد أعمال معتمدة بعد.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
