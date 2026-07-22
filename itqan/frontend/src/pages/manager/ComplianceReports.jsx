import { useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, Clock, Users, Download } from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";

export default function ComplianceReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/reports/compliance")
      .then((r) => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const printReport = () => {
    const css = `
      @page { size: A4 portrait; margin: 14mm; }
      body { font-family: 'Cairo', sans-serif; direction: rtl; background:#fff; color:#111; margin:0; }
      h1 { font-size:22px; font-weight:900; margin-bottom:4px; }
      p.sub { color:#888; font-size:12px; margin-bottom:16px; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      thead tr { background:#6366f1; color:#fff; }
      th,td { padding:7px 10px; text-align:right; border:1px solid #e5e7eb; }
      tbody tr:nth-child(even) { background:#f9fafb; }
      .ok { color:#059669; font-weight:700; }
      .fail { color:#dc2626; font-weight:700; }
    `;
    const rows = report.records.map((r) => `
      <tr>
        <td>${r.name}</td>
        <td>${r.job_title || "—"}</td>
        <td>${r.days_attended}</td>
        <td>${r.total_hours_30d}</td>
        <td>${r.avg_hours_per_day}</td>
        <td>${r.leaves_taken} / ${r.leave_quota}</td>
        <td class="${r.compliant ? "ok" : "fail"}">${r.compliant ? "✓ ممتثل" : "✗ غير ممتثل"}</td>
      </tr>
    `).join("");
    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"/><style>${css}</style></head><body>
      <h1>تقرير الامتثال لقانون العمل</h1>
      <p class="sub">الفترة: ${report.period} — تاريخ التصدير: ${new Date().toLocaleDateString("ar-EG")}</p>
      <table><thead><tr>
        <th>الموظف</th><th>الوظيفة</th><th>أيام الحضور</th>
        <th>إجمالي ساعات</th><th>متوسط يومي</th><th>الإجازات</th><th>الامتثال</th>
      </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div>
      <PageHeader title="تقارير الامتثال" subtitle="مراجعة الالتزام بساعات العمل والإجازات القانونية" icon={ShieldCheck}>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          {report && (
            <button onClick={printReport} className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover">
              <Download className="h-4 w-4" /> تصدير PDF
            </button>
          )}
        </div>
      </PageHeader>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground">جارٍ إنشاء التقرير...</div>
      ) : !report ? (
        <GlassCard className="py-16 text-center">
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد بيانات</p>
          <p className="mt-1 text-sm text-muted-foreground">أضف موظفين وبيانات حضور أولاً</p>
        </GlassCard>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-4 rounded-2xl bg-muted/40 p-4 text-sm grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-4">
            <div><span className="text-muted-foreground">الفترة: </span><span className="font-bold">{report.period}</span></div>
            <div><span className="text-muted-foreground">ساعات العمل: </span><span className="font-bold">{report.work_hours}</span></div>
            <div><span className="text-muted-foreground">السماحية: </span><span className="font-bold">{report.grace_minutes} دقيقة</span></div>
            <div><span className="text-muted-foreground">حصة الإجازة: </span><span className="font-bold">{report.leave_quota_days} يوم/سنة</span></div>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="إجمالي الموظفين"  value={report.total_employees}   icon={Users}        accent="from-blue-500 to-cyan-500" />
            <StatCard label="ممتثلون"           value={report.compliant_count}   icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
            <StatCard label="غير ممتثلون"       value={report.total_employees - report.compliant_count} icon={XCircle} accent="from-rose-500 to-pink-500" />
            <StatCard label="نسبة الامتثال"     value={`${Math.round(report.compliant_count / Math.max(report.total_employees, 1) * 100)}%`} icon={ShieldCheck} accent="from-violet-500 to-purple-500" />
          </div>

          {/* Table */}
          <GlassCard>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 text-right font-bold">الموظف</th>
                    <th className="py-2 text-right font-bold">الوظيفة</th>
                    <th className="py-2 text-center font-bold">أيام الحضور</th>
                    <th className="py-2 text-center font-bold">إجمالي ساعات</th>
                    <th className="py-2 text-center font-bold">متوسط يومي</th>
                    <th className="py-2 text-center font-bold">الإجازات</th>
                    <th className="py-2 text-center font-bold">الامتثال</th>
                  </tr>
                </thead>
                <tbody>
                  {report.records.map((r) => (
                    <tr key={r.employee_id} className="border-b border-border/30 hover:bg-white/5">
                      <td className="py-2 font-bold">{r.name}</td>
                      <td className="py-2 text-muted-foreground">{r.job_title || "—"}</td>
                      <td className="py-2 text-center">{r.days_attended}</td>
                      <td className="py-2 text-center">{r.total_hours_30d}س</td>
                      <td className="py-2 text-center">{r.avg_hours_per_day}س</td>
                      <td className="py-2 text-center">
                        <span>{r.leaves_taken}</span>
                        <span className="text-muted-foreground">/{r.leave_quota}</span>
                      </td>
                      <td className="py-2 text-center">
                        {r.compliant ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> ممتثل
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-rose-400">
                            <XCircle className="h-3 w-3" /> مراجعة
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {report.records.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">لا يوجد موظفون</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}
