import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Printer, Download, Users, Wallet, TrendingDown, TrendingUp,
  CalendarCheck, Clock, XCircle, CheckCircle2, RefreshCw, ChevronLeft,
  ChevronRight, Building2, BarChart3, Sparkles, User,
} from "lucide-react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard } from "@/components/Kit";

const EMPLOYEE_PDF_CSS = `
  @page { size: A4 portrait; margin: 14mm; }
  body { font-family: 'Noto Kufi Arabic', 'Cairo', sans-serif; direction: rtl; background: #fff; color: #111; margin: 0; }
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #6366f1; padding-bottom: 12px; margin-bottom: 20px; }
  .logo { font-size: 28px; font-weight: 900; color: #6366f1; }
  .header-info h1 { font-size: 20px; font-weight: 900; margin: 0 0 4px; color: #111; }
  .header-info p { font-size: 11px; color: #888; margin: 0; }
  .emp-card { display: flex; align-items: center; gap: 16px; border: 2px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; }
  .emp-avatar { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #6366f1, #06b6d4); display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 900; }
  .emp-info h2 { font-size: 18px; font-weight: 900; margin: 0 0 4px; }
  .emp-info p { font-size: 12px; color: #888; margin: 0; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; text-align: center; }
  .stat-card .val { font-size: 20px; font-weight: 900; }
  .stat-card .lbl { font-size: 10px; color: #888; margin-top: 2px; }
  .sal-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
  .sal-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
  .sal-card .lbl { font-size: 10px; color: #888; }
  .sal-card .val { font-size: 16px; font-weight: 900; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  thead tr { background: #6366f1; color: white; }
  th, td { padding: 7px 10px; text-align: right; border: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  .ok { color: #059669; font-weight: 700; }
  .late { color: #d97706; font-weight: 700; }
  .abs { color: #dc2626; font-weight: 700; }
  .deduct { color: #dc2626; }
  footer { margin-top: 20px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #e5e7eb; padding-top: 10px; }
`;

async function printEmployeePDF(row, company) {
  try {
    const { data } = await api.get(`/reports/employee/${row.id}`);
    const e = data.employee;
    const st = data.stats;

    const html = `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8"/>
      <title>تقرير ${e.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700;900&display=swap" rel="stylesheet"/>
      <style>${EMPLOYEE_PDF_CSS}</style>
    </head><body>
      <div class="header">
        <div class="header-info">
          <h1>تقرير موظف تفصيلي</h1>
          <p>${company || ""} — ${new Date().toLocaleDateString("ar-EG")}</p>
        </div>
        <div class="logo">إتقان</div>
      </div>

      <div class="emp-card">
        <div class="emp-avatar">${e.name?.[0] || "؟"}</div>
        <div class="emp-info">
          <h2>${e.name}</h2>
          <p>${e.job_title || "موظف"} | ${e.phone || "بدون هاتف"}</p>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><div class="val ok">${st.present_days}</div><div class="lbl">أيام حضور</div></div>
        <div class="stat-card"><div class="val late">${st.late_days}</div><div class="lbl">أيام تأخير</div></div>
        <div class="stat-card"><div class="val abs">${st.absent_days}</div><div class="lbl">أيام غياب</div></div>
        <div class="stat-card"><div class="val" style="color:#6366f1">${st.attendance_rate}%</div><div class="lbl">نسبة الالتزام</div></div>
      </div>

      <div class="sal-grid">
        <div class="sal-card"><div class="lbl">الراتب الأساسي</div><div class="val">${(e.monthly_salary || 0).toLocaleString()} ج.م</div></div>
        <div class="sal-card"><div class="lbl">إجمالي الخصومات</div><div class="val deduct">- ${(e.total_deductions || 0).toLocaleString()} ج.م</div></div>
        <div class="sal-card"><div class="lbl">صافي الراتب</div><div class="val ok">${((e.monthly_salary || 0) + (e.total_additions || 0) - (e.total_deductions || 0)).toLocaleString()} ج.م</div></div>
      </div>

      <h3 style="margin-bottom:8px;font-size:13px">سجل الحضور</h3>
      <table>
        <thead><tr><th>التاريخ</th><th>الحالة</th><th>الوقت</th><th>الطريقة</th><th>الخصم</th></tr></thead>
        <tbody>
          ${data.logs.map((l) => `<tr>
            <td>${l.log_date}</td>
            <td class="${l.type === "present" ? "ok" : l.type === "late" ? "late" : "abs"}">${l.type === "present" ? "حاضر" : l.type === "late" ? "متأخر" : "غائب"}</td>
            <td>${l.check_time}</td>
            <td>${l.method}</td>
            <td class="deduct">${l.deduction_amount ? l.deduction_amount.toLocaleString() + " ج.م" : "—"}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <footer>تم إنشاء هذا التقرير بواسطة منصة إتقان لإدارة الأعمال</footer>
    </body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  } catch (e) {
    console.error(e);
  }
}

const ARABIC_MONTHS = [
  "", "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

const fmt = (v) => `${(v || 0).toLocaleString("ar-EG")} ج.م`;

function StatCard({ icon: Icon, label, value, accent = "from-primary to-cyan-500", sub }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card/60 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-black">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function AttBadge({ type, days }) {
  if (!days) return <span className="text-muted-foreground/40">—</span>;
  const cfg = {
    present: { cls: "bg-emerald-500/15 text-emerald-400", label: `${days} حضور` },
    late:    { cls: "bg-amber-400/15 text-amber-400",   label: `${days} تأخير` },
    absent:  { cls: "bg-red-500/15 text-red-400",       label: `${days} غياب` },
  }[type];
  return <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${cfg.cls}`}>{cfg.label}</span>;
}

export default function Reports() {
  const { company } = useAuth();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  const load = useCallback(async (y, m) => {
    setLoading(true);
    try {
      const { data: res } = await api.get(`/reports/monthly?year=${y}&month=${m}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const prevMonth = () => {
    const nm = month === 1 ? 12 : month - 1;
    const ny = month === 1 ? year - 1 : year;
    setMonth(nm); setYear(ny); load(ny, nm);
  };
  const nextMonth = () => {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    setMonth(nm); setYear(ny); load(ny, nm);
  };

  const handlePrint = () => {
    const printCSS = `
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: 'Noto Kufi Arabic', 'Cairo', sans-serif; direction: rtl; background: #fff; color: #111; }
      .no-print { display: none !important; }
      .print-root { padding: 0; background: white; }
      .print-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #6366f1; padding-bottom: 10px; margin-bottom: 16px; }
      .print-header h1 { font-size: 22px; font-weight: 900; color: #111; margin: 0; }
      .print-header p  { font-size: 12px; color: #666; margin: 2px 0 0; }
      .summary-grid { display: grid; grid-template-columns: repeat(5,1fr); gap: 8px; margin-bottom: 16px; }
      .summary-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; text-align: center; }
      .summary-card p:first-child { font-size: 10px; color: #888; margin: 0 0 3px; }
      .summary-card p:last-child  { font-size: 15px; font-weight: 900; color: #111; margin: 0; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      thead tr { background: #6366f1; color: white; }
      th, td { padding: 7px 10px; text-align: right; border: 1px solid #e5e7eb; }
      tbody tr:nth-child(even) { background: #f9fafb; }
      .net-col { font-weight: 900; color: #059669; }
      .deduct { color: #dc2626; }
      .add    { color: #059669; }
      .att-ok  { color: #059669; }
      .att-late{ color: #d97706; }
      .att-abs { color: #dc2626; }
    `;
    const html = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8"/>
        <title>تقرير ${ARABIC_MONTHS[month]} ${year}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Kufi+Arabic:wght@400;700;900&display=swap" rel="stylesheet"/>
        <style>${printCSS}</style>
      </head>
      <body>
        <div class="print-root">
          <div class="print-header">
            <div>
              <h1>📋 تقرير الرواتب والحضور</h1>
              <p>${data?.company || ""} — ${ARABIC_MONTHS[month]} ${year}</p>
              <p>تاريخ الإصدار: ${new Date().toLocaleDateString("ar-EG")}</p>
            </div>
            <div style="font-size:32px; font-weight:900; color:#6366f1;">إتقان</div>
          </div>

          <div class="summary-grid">
            <div class="summary-card"><p>إجمالي الموظفين</p><p>${data?.summary?.total_employees}</p></div>
            <div class="summary-card"><p>إجمالي الرواتب</p><p>${(data?.summary?.total_base_payroll || 0).toLocaleString()} ج.م</p></div>
            <div class="summary-card"><p>إجمالي الخصومات</p><p>${(data?.summary?.total_deductions || 0).toLocaleString()} ج.م</p></div>
            <div class="summary-card"><p>إجمالي الإضافات</p><p>${(data?.summary?.total_additions || 0).toLocaleString()} ج.م</p></div>
            <div class="summary-card" style="border-color:#059669;"><p>صافي المرتبات</p><p style="color:#059669">${(data?.summary?.net_payroll || 0).toLocaleString()} ج.م</p></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th><th>الاسم</th><th>المسمى الوظيفي</th>
                <th>الراتب الأساسي</th>
                <th>أيام حضور</th><th>أيام تأخير</th><th>أيام غياب</th>
                <th>خصم الحضور</th><th>خصومات يدوية</th><th>إضافات</th>
                <th>صافي الراتب</th>
              </tr>
            </thead>
            <tbody>
              ${(data?.rows || []).map((r, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${r.name}</strong></td>
                  <td>${r.job_title}</td>
                  <td>${r.base_salary.toLocaleString()} ج.م</td>
                  <td class="att-ok">${r.present_days || "—"}</td>
                  <td class="att-late">${r.late_days || "—"}</td>
                  <td class="att-abs">${r.absent_days || "—"}</td>
                  <td class="deduct">${r.att_deductions ? r.att_deductions.toLocaleString() + " ج.م" : "—"}</td>
                  <td class="deduct">${r.manual_deductions ? r.manual_deductions.toLocaleString() + " ج.م" : "—"}</td>
                  <td class="add">${r.manual_additions ? r.manual_additions.toLocaleString() + " ج.م" : "—"}</td>
                  <td class="net-col">${r.net_salary.toLocaleString()} ج.م</td>
                </tr>
              `).join("")}
              <tr style="background:#ede9fe; font-weight:900;">
                <td colspan="3">الإجمالي</td>
                <td>${(data?.summary?.total_base_payroll || 0).toLocaleString()} ج.م</td>
                <td class="att-ok">${data?.summary?.present_total || 0}</td>
                <td class="att-late">${data?.summary?.late_total || 0}</td>
                <td class="att-abs">${data?.summary?.absent_total || 0}</td>
                <td colspan="2" class="deduct">${(data?.summary?.total_deductions || 0).toLocaleString()} ج.م</td>
                <td class="add">${(data?.summary?.total_additions || 0).toLocaleString()} ج.م</td>
                <td class="net-col" style="color:#059669">${(data?.summary?.net_payroll || 0).toLocaleString()} ج.م</td>
              </tr>
            </tbody>
          </table>
          <p style="margin-top:16px;font-size:10px;color:#aaa;text-align:center;">تم إنشاء هذا التقرير تلقائياً بواسطة منصة إتقان لإدارة الأعمال</p>
        </div>
      </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=1100,height=750");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  };

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تقارير الرواتب والحضور"
        subtitle="تقرير شهري تفصيلي قابل للطباعة لكل موظفي الشركة"
        icon={FileText}
      >
        {data && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-2xl gradient-primary px-5 py-2.5 text-sm font-bold text-white void-glow transition hover:opacity-90"
          >
            <Printer className="h-4 w-4" /> طباعة / PDF
          </button>
        )}
      </PageHeader>

      {/* Month Selector */}
      <GlassCard className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-muted/60 transition"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="font-display text-2xl font-black">{ARABIC_MONTHS[month]}</p>
            <p className="text-sm text-muted-foreground">{year}</p>
          </div>
          <button
            onClick={nextMonth}
            disabled={year === now.getFullYear() && month === now.getMonth() + 1}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border hover:bg-muted/60 transition disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => { const m = +e.target.value; setMonth(m); load(year, m); }}
            className="rounded-xl border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {ARABIC_MONTHS.slice(1).map((n, i) => (
              <option key={i+1} value={i+1}>{n}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => { const y = +e.target.value; setYear(y); load(y, month); }}
            className="rounded-xl border border-border bg-card/60 px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => load(year, month)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60 transition hover:opacity-90"
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? "جارٍ التحميل..." : "إنشاء التقرير"}
          </button>
        </div>
      </GlassCard>

      <AnimatePresence mode="wait">
        {!data && !loading && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="py-20 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl gradient-primary void-glow text-white">
                <FileText className="h-10 w-10" />
              </div>
              <p className="font-display text-xl font-bold">اختر الشهر وابدأ</p>
              <p className="mt-2 text-sm text-muted-foreground">اضغط «إنشاء التقرير» لعرض تفاصيل الرواتب والحضور</p>
            </GlassCard>
          </motion.div>
        )}

        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="py-20 text-center">
              <RefreshCw className="mx-auto h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">جارٍ تحليل البيانات...</p>
            </GlassCard>
          </motion.div>
        )}

        {data && !loading && (
          <motion.div
            key={`${year}-${month}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
            ref={printRef}
          >
            {/* Header banner */}
            <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 px-5 py-3">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-bold">{data.company} — تقرير {ARABIC_MONTHS[month]} {year}</p>
                  <p className="text-xs text-muted-foreground">تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG")}</p>
                </div>
              </div>
              <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-xl border border-primary/40 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 transition">
                <Printer className="h-4 w-4" /> طباعة
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard icon={Users}       label="عدد الموظفين"    value={s?.total_employees}                             accent="from-violet-600 to-purple-500" />
              <StatCard icon={Wallet}      label="إجمالي الرواتب"  value={fmt(s?.total_base_payroll)}                     accent="from-primary to-cyan-500" />
              <StatCard icon={TrendingDown}label="إجمالي الخصومات" value={fmt(s?.total_deductions)}                       accent="from-red-600 to-rose-500" />
              <StatCard icon={TrendingUp}  label="إجمالي الإضافات" value={fmt(s?.total_additions)}                       accent="from-emerald-600 to-green-500" />
              <StatCard icon={CheckCircle2}label="صافي المرتبات"   value={fmt(s?.net_payroll)} sub="القيمة الفعلية المصروفة" accent="from-amber-500 to-orange-500" />
            </div>

            {/* Attendance Summary */}
            <div className="grid grid-cols-3 gap-4">
              <GlassCard className="text-center border-emerald-400/20">
                <CalendarCheck className="mx-auto mb-1 h-6 w-6 text-emerald-400" />
                <p className="font-display text-3xl font-black text-emerald-400">{s?.present_total ?? 0}</p>
                <p className="text-xs text-muted-foreground">إجمالي أيام الحضور</p>
              </GlassCard>
              <GlassCard className="text-center border-amber-400/20">
                <Clock className="mx-auto mb-1 h-6 w-6 text-amber-400" />
                <p className="font-display text-3xl font-black text-amber-400">{s?.late_total ?? 0}</p>
                <p className="text-xs text-muted-foreground">إجمالي أيام التأخير</p>
              </GlassCard>
              <GlassCard className="text-center border-red-400/20">
                <XCircle className="mx-auto mb-1 h-6 w-6 text-red-400" />
                <p className="font-display text-3xl font-black text-red-400">{s?.absent_total ?? 0}</p>
                <p className="text-xs text-muted-foreground">إجمالي أيام الغياب</p>
              </GlassCard>
            </div>

            {/* Main Table */}
            <GlassCard className="p-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                  <FileText className="h-5 w-5 text-primary" />
                  تفاصيل كل موظف — {ARABIC_MONTHS[month]} {year}
                </h3>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {data.rows?.length} موظف
                </span>
              </div>

              {data.rows?.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Users className="mx-auto mb-3 h-10 w-10 opacity-30" />
                  <p>لا يوجد موظفون مسجلون</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" style={{ direction: "rtl" }}>
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        {["#","الاسم","المسمى","الراتب الأساسي","حضور","تأخير","غياب","خصم حضور","خصم يدوي","إضافات","صافي الراتب","PDF"].map((h) => (
                          <th key={h} className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border/50 hover:bg-muted/30 transition"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 font-bold">{r.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.job_title}</td>
                          <td className="px-4 py-3 font-mono">{r.base_salary.toLocaleString()} ج.م</td>
                          <td className="px-4 py-3"><AttBadge type="present" days={r.present_days} /></td>
                          <td className="px-4 py-3"><AttBadge type="late"    days={r.late_days} /></td>
                          <td className="px-4 py-3"><AttBadge type="absent"  days={r.absent_days} /></td>
                          <td className="px-4 py-3 font-mono text-red-400">{r.att_deductions ? `${r.att_deductions.toLocaleString()} ج.م` : "—"}</td>
                          <td className="px-4 py-3 font-mono text-red-400">{r.manual_deductions ? `${r.manual_deductions.toLocaleString()} ج.م` : "—"}</td>
                          <td className="px-4 py-3 font-mono text-emerald-400">{r.manual_additions ? `${r.manual_additions.toLocaleString()} ج.م` : "—"}</td>
                          <td className="px-4 py-3">
                            <span className="rounded-xl bg-emerald-500/15 px-3 py-1 font-display font-black text-emerald-400">
                              {r.net_salary.toLocaleString()} ج.م
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => printEmployeePDF(r, data.company)}
                              title="تقرير PDF لهذا الموظف"
                              className="flex items-center gap-1 rounded-lg border border-primary/30 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary/10 transition"
                            >
                              <Printer className="h-3 w-3" /> PDF
                            </button>
                          </td>
                        </motion.tr>
                      ))}

                      {/* Totals Row */}
                      <tr className="border-t-2 border-primary/30 bg-primary/5 font-bold">
                        <td colSpan={3} className="px-4 py-3 font-black">الإجمالي</td>
                        <td className="px-4 py-3 font-mono font-black">{(s?.total_base_payroll || 0).toLocaleString()} ج.م</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">{s?.present_total || 0}</td>
                        <td className="px-4 py-3 text-amber-400 font-bold">{s?.late_total || 0}</td>
                        <td className="px-4 py-3 text-red-400 font-bold">{s?.absent_total || 0}</td>
                        <td colSpan={2} className="px-4 py-3 font-mono text-red-400 font-black">{(s?.total_deductions || 0).toLocaleString()} ج.م</td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-black">{(s?.total_additions || 0).toLocaleString()} ج.م</td>
                        <td className="px-4 py-3">
                          <span className="rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-1 font-display font-black text-white text-sm">
                            {(s?.net_payroll || 0).toLocaleString()} ج.م
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>

            <p className="text-center text-xs text-muted-foreground/50">
              تم إنشاء هذا التقرير تلقائياً بواسطة منصة إتقان لإدارة الأعمال — {new Date().toLocaleDateString("ar-EG")}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
