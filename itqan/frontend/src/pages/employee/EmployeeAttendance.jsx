import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard } from "@/components/Kit";
import { formatTime12h } from "@/lib/utils";

export default function EmployeeAttendance() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/attendance").then((r) => setLogs(r.data)).catch(() => {}); }, []);

  const badge = (t) => {
    if (t === "present") return <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-4 w-4" /> حاضر</span>;
    if (t === "late") return <span className="flex items-center gap-1 text-amber-400"><Clock className="h-4 w-4" /> متأخر</span>;
    return <span className="flex items-center gap-1 text-red-400"><XCircle className="h-4 w-4" /> غائب</span>;
  };

  return (
    <div>
      <PageHeader title="سجل حضوري" subtitle="كل أيام حضورك وتأخيرك وغيابك" icon={CalendarDays} />
      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="my-attendance-table">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">التاريخ</th><th className="p-3">الوقت</th><th className="p-3">الحالة</th><th className="p-3">الخصم</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-border/50">
                  <td className="p-3 font-mono-x text-muted-foreground">{l.log_date}</td>
                  <td className="p-3 font-mono-x">{formatTime12h(l.check_time)}</td>
                  <td className="p-3">{badge(l.type)}</td>
                  <td className="p-3 font-mono-x text-red-400">{l.deduction_amount ? l.deduction_amount : "—"}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">لا توجد سجلات بعد.</td></tr>}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
