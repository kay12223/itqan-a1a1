import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Clock, Save, AlertCircle, CheckCircle2, XCircle, Sun, Sunset, Moon, Plus, Trash2,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Field, PrimaryButton } from "@/components/Kit";
import { formatTime12h } from "@/lib/utils";

const SHIFT_DEFAULTS = {
  morning:   { label: "الصباحي 🌅",  icon: "🌅", work_start: "08:00", work_end: "16:00", check_in_deadline: "08:30" },
  afternoon: { label: "المسائي 🌆",  icon: "🌆", work_start: "14:00", work_end: "22:00", check_in_deadline: "14:30" },
  evening:   { label: "الليلي 🌙",   icon: "🌙", work_start: "22:00", work_end: "06:00", check_in_deadline: "22:30" },
};

function ShiftBadge({ type }) {
  const map = { morning: "text-amber-400 bg-amber-400/10 border-amber-400/30", afternoon: "text-sky-400 bg-sky-400/10 border-sky-400/30", evening: "text-violet-400 bg-violet-400/10 border-violet-400/30" };
  const label = SHIFT_DEFAULTS[type]?.label || type;
  return <span className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${map[type] || "bg-muted"}`}>{label}</span>;
}

export default function Attendance() {
  const { company, setCompany } = useAuth();
  const [activeShift, setActiveShift] = useState("morning");
  const [shifts, setShifts] = useState({
    morning:   { ...SHIFT_DEFAULTS.morning,   late_deduction: 50, absence_deduction: 200, enabled: true },
    afternoon: { ...SHIFT_DEFAULTS.afternoon, late_deduction: 50, absence_deduction: 200, enabled: false },
    evening:   { ...SHIFT_DEFAULTS.evening,   late_deduction: 50, absence_deduction: 200, enabled: false },
  });
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [logFilter, setLogFilter] = useState("all");

  useEffect(() => {
    if (company?.attendance) {
      const att = company.attendance;
      if (att.shifts) {
        setShifts((s) => ({ ...s, ...att.shifts }));
        setActiveShift(Object.keys(att.shifts).find((k) => att.shifts[k]?.enabled) || "morning");
      } else {
        // legacy single-shift migration
        setShifts((s) => ({
          ...s,
          morning: {
            ...s.morning,
            check_in_deadline: att.check_in_deadline || "09:30",
            work_start: att.work_start || "09:00",
            work_end: att.work_end || "17:00",
            late_deduction: att.late_deduction || 50,
            absence_deduction: att.absence_deduction || 200,
            enabled: true,
          },
        }));
      }
    }
  }, [company]);

  const load = () => api.get("/attendance").then((r) => setLogs(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const currentShift = shifts[activeShift];
  const updateShift = (key, val) => setShifts((s) => ({ ...s, [activeShift]: { ...s[activeShift], [key]: val } }));
  const toggleShift = (key) => setShifts((s) => ({ ...s, [key]: { ...s[key], enabled: !s[key].enabled } }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/company/attendance-settings", {
        check_in_deadline: shifts.morning.check_in_deadline,
        work_start: shifts.morning.work_start,
        work_end: shifts.morning.work_end,
        late_deduction: Number(shifts.morning.late_deduction),
        absence_deduction: Number(shifts.morning.absence_deduction),
        shifts: {
          morning:   { ...shifts.morning,   late_deduction: Number(shifts.morning.late_deduction),   absence_deduction: Number(shifts.morning.absence_deduction) },
          afternoon: { ...shifts.afternoon, late_deduction: Number(shifts.afternoon.late_deduction), absence_deduction: Number(shifts.afternoon.absence_deduction) },
          evening:   { ...shifts.evening,   late_deduction: Number(shifts.evening.late_deduction),   absence_deduction: Number(shifts.evening.absence_deduction) },
        },
      });
      setCompany((c) => ({ ...c, ...data }));
      toast.success("تم حفظ إعدادات الحضور ✅");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const processAbsences = async () => {
    try {
      const { data } = await api.post("/attendance/process-absences");
      toast.success(data.message);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const typeBadge = (t) => {
    if (t === "present") return <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-4 w-4" /> حاضر</span>;
    if (t === "late") return <span className="flex items-center gap-1 text-amber-400"><Clock className="h-4 w-4" /> متأخر</span>;
    return <span className="flex items-center gap-1 text-red-400"><XCircle className="h-4 w-4" /> غائب</span>;
  };

  const filteredLogs = logFilter === "all" ? logs : logs.filter((l) => l.type === logFilter);

  const shiftIcons = { morning: Sun, afternoon: Sunset, evening: Moon };

  return (
    <div className="space-y-6">
      <PageHeader
        title="الحضور والغياب والخصومات"
        subtitle="حدّد مواعيد الدوام — صباحي / مسائي / ليلي — والخصومات تُطبَّق آلياً"
        icon={Clock}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="space-y-4 lg:col-span-1">
          {/* Shift Selector Tabs */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex border-b border-border">
              {Object.entries(SHIFT_DEFAULTS).map(([key, def]) => {
                const Icon = shiftIcons[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveShift(key)}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-bold transition-all border-b-2 ${
                      activeShift === key
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px]">{key === "morning" ? "صباحي" : key === "afternoon" ? "مسائي" : "ليلي"}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-base font-bold">{SHIFT_DEFAULTS[activeShift]?.label}</h3>
                <button
                  onClick={() => toggleShift(activeShift)}
                  className={`flex h-6 w-12 items-center rounded-full transition-colors ${currentShift?.enabled ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${currentShift?.enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>

              {!currentShift?.enabled && (
                <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  هذا الوردية معطّل — فعّله للضبط
                </div>
              )}

              {currentShift?.enabled && (
                <form onSubmit={save} className="space-y-3">
                  <Field
                    label="آخر موعد للحضور"
                    type="time"
                    value={currentShift.check_in_deadline}
                    onChange={(e) => updateShift("check_in_deadline", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="بداية الدوام" type="time" value={currentShift.work_start} onChange={(e) => updateShift("work_start", e.target.value)} />
                    <Field label="نهاية الدوام" type="time" value={currentShift.work_end} onChange={(e) => updateShift("work_end", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="خصم التأخير" type="number" value={currentShift.late_deduction} onChange={(e) => updateShift("late_deduction", e.target.value)} />
                    <Field label="خصم الغياب" type="number" value={currentShift.absence_deduction} onChange={(e) => updateShift("absence_deduction", e.target.value)} />
                  </div>
                </form>
              )}
            </div>
          </GlassCard>

          {/* Summary of enabled shifts */}
          <GlassCard>
            <h4 className="mb-3 text-sm font-bold">الورديات المفعّلة</h4>
            <div className="space-y-2">
              {Object.entries(shifts).map(([key, sh]) => (
                <div key={key} className={`flex items-center justify-between rounded-xl p-2.5 text-xs ${sh.enabled ? "glass border border-border" : "opacity-40"}`}>
                  <div className="flex items-center gap-2">
                    {key === "morning" ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : key === "afternoon" ? <Sunset className="h-3.5 w-3.5 text-sky-400" /> : <Moon className="h-3.5 w-3.5 text-violet-400" />}
                    <span className="font-bold">{sh.enabled ? `${formatTime12h(sh.work_start)} — ${formatTime12h(sh.work_end)}` : "معطّل"}</span>
                  </div>
                  <span className={sh.enabled ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                    {sh.enabled ? "✓ مفعّل" : "—"}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>

          <PrimaryButton onClick={save} disabled={saving} className="w-full">
            <Save className="h-4 w-4" /> {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
          </PrimaryButton>

          {/* Absence processor */}
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-400"><AlertCircle className="h-4 w-4" /> رصد الغياب اليومي</p>
            <p className="mb-3 text-xs text-muted-foreground">يسجّل غياب كل من لم يحضر اليوم ويطبّق الخصم التلقائي.</p>
            <button onClick={processAbsences} className="w-full rounded-xl border border-amber-400/40 py-2 text-sm font-bold text-amber-400 hover:bg-amber-400/10">
              رصد الغياب الآن
            </button>
          </div>
        </div>

        {/* Logs Panel */}
        <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="font-display text-lg font-bold">سجل الحضور</h3>
            <div className="flex gap-1.5">
              {["all", "present", "late", "absence"].map((f) => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    logFilter === f ? "gradient-primary text-white" : "border border-border hover:bg-muted/60"
                  }`}
                >
                  {f === "all" ? "الكل" : f === "present" ? "حاضر" : f === "late" ? "متأخر" : "غائب"}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-right text-xs text-muted-foreground">
                  <th className="p-3">العضو</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الوقت</th>
                  <th className="p-3">الوردية</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">الخصم</th>
                  <th className="p-3">الصورة</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 hover:bg-muted/20 transition">
                    <td className="p-3 font-bold">{l.user_name}</td>
                    <td className="p-3 font-mono-x text-muted-foreground">{l.log_date}</td>
                    <td className="p-3 font-mono-x">{formatTime12h(l.check_time)}</td>
                    <td className="p-3">
                      {l.shift ? <ShiftBadge type={l.shift} /> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="p-3">{typeBadge(l.type)}</td>
                    <td className="p-3 font-mono-x text-red-400">{l.deduction_amount ? `${l.deduction_amount}` : "—"}</td>
                    <td className="p-3">
                      {l.photo ? (
                        <a href={l.photo} target="_blank" rel="noreferrer">
                          <img src={l.photo} alt="صورة الحضور" className="h-10 w-10 rounded-lg border border-border object-cover transition hover:scale-150" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد سجلات.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
