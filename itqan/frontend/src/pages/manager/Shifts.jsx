import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarRange, Plus, Trash2, Clock, User, RotateCcw } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton, StatCard } from "@/components/Kit";

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const SHIFT_COLORS = [
  "from-blue-500 to-cyan-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
];

const EMPTY = { name: "", start_time: "08:00", end_time: "16:00", days: [], color: 0, note: "" };

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [crew, setCrew] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [assignEmp, setAssignEmp] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [s, c] = await Promise.all([
      api.get("/shifts").catch(() => ({ data: [] })),
      api.get("/crew").catch(() => ({ data: [] })),
    ]);
    setShifts(s.data);
    setCrew(c.data);
  };
  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const toggleDay = (d) => setForm((p) => ({
    ...p,
    days: p.days.includes(d) ? p.days.filter((x) => x !== d) : [...p.days, d],
  }));

  const create = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("اسم الوردية مطلوب"); return; }
    if (form.days.length === 0) { toast.error("اختر يوماً واحداً على الأقل"); return; }
    setSaving(true);
    try {
      await api.post("/shifts", form);
      toast.success("تم إنشاء الوردية ✅");
      setAddOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const assign = async () => {
    if (!assignEmp) { toast.error("اختر موظفاً"); return; }
    try {
      await api.post(`/shifts/${assignOpen.id}/assign`, { employee_id: assignEmp });
      toast.success("تم تعيين الوردية ✅");
      setAssignOpen(null);
      setAssignEmp("");
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/shifts/${id}`); toast.success("تم حذف الوردية"); load(); }
    catch { toast.error("فشل الحذف"); }
  };

  const totalAssigned = shifts.reduce((s, sh) => s + (sh.assigned_count || 0), 0);

  return (
    <div>
      <PageHeader title="جدولة الورديات" subtitle="نظّم ورديات موظفيك واعرف من يعمل متى" icon={CalendarRange}>
        <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> وردية جديدة</PrimaryButton>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الورديات" value={shifts.length} icon={CalendarRange} accent="from-blue-500 to-cyan-500" />
        <StatCard label="موظفون مُعيَّنون" value={totalAssigned} icon={User} accent="from-violet-500 to-purple-500" />
        <StatCard label="موظفون بلا وردية" value={Math.max(0, crew.length - totalAssigned)} icon={Clock} accent="from-amber-500 to-orange-500" />
      </div>

      {shifts.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <CalendarRange className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا توجد ورديات بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">أنشئ ورديات عمل وعيّن الموظفين عليها</p>
          <PrimaryButton className="mt-5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> إنشاء وردية</PrimaryButton>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shifts.map((sh, i) => (
            <GlassCard key={sh.id} hover delay={i * 0.04}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${SHIFT_COLORS[sh.color ?? 0]} text-white text-xl`}>
                    🕐
                  </span>
                  <div>
                    <p className="font-display font-bold">{sh.name}</p>
                    <p className="text-xs text-muted-foreground">{sh.start_time} — {sh.end_time}</p>
                  </div>
                </div>
                <button onClick={() => remove(sh.id)} className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Days */}
              <div className="mt-3 flex flex-wrap gap-1">
                {DAYS_AR.map((d, idx) => (
                  <span
                    key={d}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      (sh.days || []).includes(idx)
                        ? "bg-primary/20 text-primary"
                        : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    {d.slice(0, 3)}
                  </span>
                ))}
              </div>

              {sh.note && <p className="mt-2 text-xs text-muted-foreground">{sh.note}</p>}

              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                <span className="text-xs text-muted-foreground">{sh.assigned_count || 0} موظف</span>
                <button
                  onClick={() => setAssignOpen(sh)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition hover:bg-white/10"
                >
                  <User className="h-3.5 w-3.5" /> تعيين موظف
                </button>
              </div>

              {/* Assigned employees */}
              {sh.employees?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sh.employees.slice(0, 3).map((e) => (
                    <span key={e.id} className="rounded-full bg-muted/60 px-2.5 py-0.5 text-xs">{e.name}</span>
                  ))}
                  {sh.employees.length > 3 && (
                    <span className="rounded-full bg-muted/60 px-2.5 py-0.5 text-xs">+{sh.employees.length - 3}</span>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إنشاء وردية جديدة">
        <form onSubmit={create} className="space-y-4">
          <Field label="اسم الوردية *" value={form.name} onChange={f("name")} placeholder="وردية الصباح، الليلية..." required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="وقت البدء" type="time" value={form.start_time} onChange={f("start_time")} />
            <Field label="وقت الانتهاء" type="time" value={form.end_time} onChange={f("end_time")} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">أيام العمل</p>
            <div className="flex flex-wrap gap-2">
              {DAYS_AR.map((d, idx) => (
                <button
                  key={d} type="button"
                  onClick={() => toggleDay(idx)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    form.days.includes(idx) ? "gradient-primary text-white void-glow" : "border border-border hover:bg-white/5"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">لون الوردية</p>
            <div className="flex gap-2">
              {SHIFT_COLORS.map((c, i) => (
                <button
                  key={i} type="button"
                  onClick={() => setForm((p) => ({ ...p, color: i }))}
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${c} transition ${form.color === i ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""}`}
                />
              ))}
            </div>
          </div>

          <Field label="ملاحظات" value={form.note} onChange={f("note")} placeholder="تفاصيل إضافية..." />

          <div className="flex gap-3 pt-1">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">{saving ? "جارٍ الإنشاء..." : "إنشاء الوردية"}</PrimaryButton>
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* Assign modal */}
      <Modal open={!!assignOpen} onClose={() => { setAssignOpen(null); setAssignEmp(""); }} title={`تعيين موظف لـ «${assignOpen?.name}»`}>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">اختر الموظف</span>
            <select
              value={assignEmp}
              onChange={(e) => setAssignEmp(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none"
            >
              <option value="">اختر موظفاً...</option>
              {crew.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.job_title || "موظف"}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-3">
            <PrimaryButton onClick={assign} className="flex-1">تعيين</PrimaryButton>
            <button onClick={() => { setAssignOpen(null); setAssignEmp(""); }} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">إلغاء</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
