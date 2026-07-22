import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Trash2, PlayCircle, CheckCircle2, Clock, Users, Award } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton, StatCard } from "@/components/Kit";

const LEVEL_COLORS = {
  beginner:     "text-emerald-400 bg-emerald-500/15",
  intermediate: "text-amber-400   bg-amber-500/15",
  advanced:     "text-rose-400    bg-rose-500/15",
};
const LEVEL_LABELS = { beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" };

const EMPTY = { title: "", description: "", url: "", level: "beginner", duration_min: 30, target_roles: ["member"] };

export default function LearningCenter() {
  const [courses, setCourses] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/learning").then((r) => setCourses(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("عنوان المحتوى التدريبي مطلوب"); return; }
    setSaving(true);
    try {
      await api.post("/learning", form);
      toast.success("تمت إضافة المحتوى التدريبي ✅");
      setAddOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await api.delete(`/learning/${id}`); toast.success("تم حذف المحتوى"); load(); }
    catch { toast.error("فشل الحذف"); }
  };

  const totalCompleted = courses.reduce((s, c) => s + (c.completions || 0), 0);

  return (
    <div>
      <PageHeader title="مركز تدريب الموظفين" subtitle="محتوى تدريبي مخصص لموظفيك حسب الرتبة" icon={BookOpen}>
        <PrimaryButton onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> إضافة محتوى تدريبي</PrimaryButton>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="إجمالي المحتوى" value={courses.length} icon={BookOpen} accent="from-sky-500 to-blue-500" />
        <StatCard label="إتمام إجمالي" value={totalCompleted} icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
        <StatCard label="مبتدئ" value={courses.filter((c) => c.level === "beginner").length} icon={PlayCircle} accent="from-lime-500 to-green-500" />
        <StatCard label="متقدم" value={courses.filter((c) => c.level === "advanced").length} icon={Award} accent="from-rose-500 to-pink-500" />
      </div>

      {courses.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <BookOpen className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="font-display text-lg font-bold">لا يوجد محتوى تدريبي بعد</p>
          <p className="mt-1 text-sm text-muted-foreground">أضف مقاطع ومحتوى تدريبي لرفع مستوى فريقك</p>
          <PrimaryButton className="mt-5" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> إضافة محتوى تدريبي</PrimaryButton>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, i) => (
            <GlassCard key={course.id} hover delay={i * 0.04}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-primary text-white void-glow text-xl">
                    🎓
                  </span>
                  <div>
                    <p className="font-display font-bold leading-tight">{course.title}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_COLORS[course.level] || LEVEL_COLORS.beginner}`}>
                      {LEVEL_LABELS[course.level] || course.level}
                    </span>
                  </div>
                </div>
                <button onClick={() => remove(course.id)} className="rounded-lg p-1.5 text-rose-400 transition hover:bg-rose-500/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {course.description && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{course.description}</p>}

              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.duration_min} دقيقة</div>
                <div className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.completions || 0} أتمّوا</div>
              </div>

              {course.url && (
                <a
                  href={course.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-input py-2 text-xs font-bold transition hover:bg-white/5"
                >
                  <PlayCircle className="h-4 w-4 text-primary" /> فتح المحتوى
                </a>
              )}
            </GlassCard>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة محتوى تدريبي">
        <form onSubmit={create} className="space-y-3">
          <Field label="عنوان المحتوى *" value={form.title} onChange={f("title")} placeholder="مثال: أساسيات خدمة العملاء" required />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">وصف المحتوى</span>
            <textarea value={form.description} onChange={f("description")} rows={2} placeholder="ما الذي يتعلمه الموظف..." className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none resize-none" />
          </label>
          <Field label="رابط المحتوى (يوتيوب، PDF...)" value={form.url} onChange={f("url")} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">المستوى</span>
              <select value={form.level} onChange={f("level")} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none">
                <option value="beginner">مبتدئ</option>
                <option value="intermediate">متوسط</option>
                <option value="advanced">متقدم</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-muted-foreground">المدة (دقيقة)</span>
              <input type="number" min={1} value={form.duration_min} onChange={f("duration_min")} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm outline-none" />
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <PrimaryButton type="submit" disabled={saving} className="flex-1">{saving ? "جارٍ الإضافة..." : "إضافة المحتوى"}</PrimaryButton>
            <button type="button" onClick={() => setAddOpen(false)} className="flex-1 rounded-xl border border-input py-2.5 text-sm font-bold transition hover:bg-white/5">إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
