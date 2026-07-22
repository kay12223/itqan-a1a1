import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  TrendingUp, Star, Target, Plus, Edit2, Trash2, X, Save,
  ChevronDown, ChevronUp, Award, BarChart3, BookOpen, CheckCircle2,
  Clock, User, Zap, AlertCircle, Filter,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, PrimaryButton } from "@/components/Kit";

const RATING_LABELS = { 1: "ضعيف", 2: "مقبول", 3: "جيد", 4: "ممتاز", 5: "استثنائي" };
const RATING_COLORS = { 1: "text-red-400", 2: "text-orange-400", 3: "text-yellow-400", 4: "text-emerald-400", 5: "text-purple-400" };
const GOAL_STATUS  = { pending: "قيد التنفيذ", done: "مكتمل", cancelled: "ملغي" };
const SKILL_LEVELS = ["مبتدئ", "متوسط", "متقدم", "خبير"];

function Stars({ value, onChange, size = "h-5 w-5" }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHover(n)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`transition-colors ${onChange ? "cursor-pointer" : "cursor-default"} ${
            n <= (hover || value) ? "text-amber-400" : "text-muted-foreground/30"
          }`}>
          <Star className={`${size} fill-current`} />
        </button>
      ))}
    </div>
  );
}

export default function PerformanceCenter() {
  const [crew, setCrew]         = useState([]);
  const [reviews, setReviews]   = useState([]);
  const [goals, setGoals]       = useState([]);
  const [skills, setSkills]     = useState([]);
  const [tab, setTab]           = useState("reviews");
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterEmp, setFE]      = useState("");

  // Review form
  const [rvForm, setRV] = useState({
    employee_id: "", period: "", overall_rating: 3,
    attendance_rating: 3, performance_rating: 3, teamwork_rating: 3,
    notes: "", recommendations: "",
  });
  // Goal form
  const [goalForm, setGF] = useState({ employee_id: "", title: "", description: "", deadline: "", priority: "medium" });
  // Skill form
  const [skillForm, setSF] = useState({ employee_id: "", skill_name: "", level: "متوسط", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [crewRes, revRes, goalRes, skillRes] = await Promise.all([
        api.get("/crew"),
        api.get("/performance/reviews"),
        api.get("/performance/goals"),
        api.get("/performance/skills"),
      ]);
      const crewRaw = crewRes.data?.members || crewRes.data;
      setCrew(Array.isArray(crewRaw) ? crewRaw : []);
      setReviews(Array.isArray(revRes.data) ? revRes.data : []);
      setGoals(Array.isArray(goalRes.data) ? goalRes.data : []);
      setSkills(Array.isArray(skillRes.data) ? skillRes.data : []);
    } catch (e) {
      toast.error("تعذّر تحميل البيانات");
    } finally { setLoading(false); }
  };

  const empName = (id) => crew.find(c => c.id === id)?.name || "—";

  const submitReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/performance/reviews", rvForm);
      setReviews(prev => [data, ...prev]);
      setShowForm(false);
      setRV({ employee_id: "", period: "", overall_rating: 3, attendance_rating: 3, performance_rating: 3, teamwork_rating: 3, notes: "", recommendations: "" });
      toast.success("✅ تم حفظ التقييم");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const submitGoal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/performance/goals", goalForm);
      setGoals(prev => [data, ...prev]);
      setShowForm(false);
      setGF({ employee_id: "", title: "", description: "", deadline: "", priority: "medium" });
      toast.success("✅ تم إضافة الهدف");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const submitSkill = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post("/performance/skills", skillForm);
      setSkills(prev => [data, ...prev]);
      setShowForm(false);
      setSF({ employee_id: "", skill_name: "", level: "متوسط", notes: "" });
      toast.success("✅ تم إضافة المهارة");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const updateGoalStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/performance/goals/${id}`, { status });
      setGoals(prev => prev.map(g => g.id === id ? data : g));
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("حذف هذا التقييم؟")) return;
    try {
      await api.delete(`/performance/reviews/${id}`);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success("تم الحذف");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const avgRating = (r) => ((r.overall_rating + r.attendance_rating + r.performance_rating + r.teamwork_rating) / 4).toFixed(1);

  const filteredReviews = filterEmp ? reviews.filter(r => r.employee_id === filterEmp) : reviews;
  const filteredGoals   = filterEmp ? goals.filter(g => g.employee_id === filterEmp) : goals;
  const filteredSkills  = filterEmp ? skills.filter(s => s.employee_id === filterEmp) : skills;

  // Summary stats
  const totalReviews = reviews.length;
  const avgOverall = reviews.length ? (reviews.reduce((a, r) => a + (r.overall_rating || 0), 0) / reviews.length).toFixed(1) : "—";
  const doneGoals  = goals.filter(g => g.status === "done").length;
  const totalGoals = goals.length;

  const TABS = [
    { id: "reviews", label: "التقييمات الدورية", icon: Star, count: reviews.length },
    { id: "goals",   label: "الأهداف والإنجازات", icon: Target, count: goals.length },
    { id: "skills",  label: "المهارات والكفاءات", icon: BookOpen, count: skills.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="مركز التطوير الوظيفي"
        subtitle="تقييم الأداء — الأهداف — المهارات"
        icon={TrendingUp}
        action={
          <PrimaryButton onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> إضافة جديد
          </PrimaryButton>
        }
      />

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "إجمالي التقييمات", value: totalReviews, icon: BarChart3, color: "text-blue-400" },
          { label: "متوسط الأداء", value: avgOverall !== "—" ? `${avgOverall}/5` : "—", icon: Star, color: "text-amber-400" },
          { label: "الأهداف المكتملة", value: `${doneGoals}/${totalGoals}`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "المهارات المسجلة", value: skills.length, icon: Zap, color: "text-purple-400" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <GlassCard className="text-center">
              <s.icon className={`mx-auto h-6 w-6 mb-1 ${s.color}`} />
              <p className={`font-display text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Filter by employee */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <select value={filterEmp}
          onChange={e => setFE(e.target.value)}
          className="rounded-xl border border-input bg-background/60 px-3 py-1.5 text-sm">
          <option value="">كل الموظفين</option>
          {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition-all ${
              tab === t.id ? "gradient-primary text-white" : "glass border border-border text-muted-foreground hover:text-foreground"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
            {t.count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${tab === t.id ? "bg-white/20" : "bg-muted"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Reviews ── */}
      {tab === "reviews" && (
        <div className="space-y-3">
          {loading ? <div className="py-10 text-center text-muted-foreground">جارٍ التحميل...</div>
          : filteredReviews.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Star className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p>لا توجد تقييمات بعد</p>
            </div>
          ) : filteredReviews.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <GlassCard>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary text-white font-bold text-sm">
                      {empName(r.employee_id)?.[0] || "م"}
                    </div>
                    <div>
                      <p className="font-bold">{empName(r.employee_id)}</p>
                      <p className="text-xs text-muted-foreground">{r.period || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className={`font-display text-2xl font-black ${RATING_COLORS[Math.round(r.overall_rating)]}`}>
                        {avgRating(r)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">من 5</p>
                    </div>
                    <Stars value={Math.round(parseFloat(avgRating(r)))} size="h-4 w-4" />
                    <button onClick={() => deleteReview(r.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: "الحضور", val: r.attendance_rating },
                    { label: "الأداء", val: r.performance_rating },
                    { label: "العمل الجماعي", val: r.teamwork_rating },
                  ].map(m => (
                    <div key={m.label} className="rounded-xl bg-muted/30 p-2 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                      <Stars value={m.val} size="h-3.5 w-3.5" />
                      <p className={`text-xs font-bold mt-0.5 ${RATING_COLORS[m.val]}`}>{RATING_LABELS[m.val]}</p>
                    </div>
                  ))}
                </div>

                {(r.notes || r.recommendations) && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {r.notes && (
                      <div className="rounded-xl bg-muted/30 p-2.5">
                        <p className="text-[10px] text-muted-foreground mb-1">ملاحظات</p>
                        <p className="text-xs">{r.notes}</p>
                      </div>
                    )}
                    {r.recommendations && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                        <p className="text-[10px] text-emerald-400 mb-1">توصيات التطوير</p>
                        <p className="text-xs">{r.recommendations}</p>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Goals ── */}
      {tab === "goals" && (
        <div className="space-y-3">
          {loading ? <div className="py-10 text-center text-muted-foreground">جارٍ التحميل...</div>
          : filteredGoals.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Target className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p>لا توجد أهداف مضافة</p>
            </div>
          ) : filteredGoals.map((g, i) => (
            <motion.div key={g.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <GlassCard className={g.status === "done" ? "opacity-70" : ""}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    g.status === "done" ? "bg-emerald-500/20 text-emerald-400" :
                    g.status === "cancelled" ? "bg-red-500/20 text-red-400" :
                    "bg-primary/15 text-primary"
                  }`}>
                    {g.status === "done" ? <CheckCircle2 className="h-4 w-4" /> :
                     g.status === "cancelled" ? <X className="h-4 w-4" /> :
                     <Target className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className={`font-bold ${g.status === "done" ? "line-through text-muted-foreground" : ""}`}>{g.title}</p>
                        <p className="text-xs text-muted-foreground">{empName(g.employee_id)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {g.deadline && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" /> {new Date(g.deadline).toLocaleDateString("ar-EG")}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          g.priority === "high" ? "bg-red-500/15 text-red-400" :
                          g.priority === "low"  ? "bg-muted text-muted-foreground" :
                          "bg-primary/15 text-primary"
                        }`}>
                          {g.priority === "high" ? "عالي" : g.priority === "low" ? "منخفض" : "متوسط"}
                        </span>
                      </div>
                    </div>
                    {g.description && <p className="mt-1 text-xs text-muted-foreground">{g.description}</p>}
                    <div className="mt-2 flex gap-2">
                      {g.status !== "done" && (
                        <button onClick={() => updateGoalStatus(g.id, "done")}
                          className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                          ✓ مكتمل
                        </button>
                      )}
                      {g.status === "pending" && (
                        <button onClick={() => updateGoalStatus(g.id, "cancelled")}
                          className="rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors">
                          ✕ إلغاء
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Skills ── */}
      {tab === "skills" && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {loading ? <div className="col-span-3 py-10 text-center text-muted-foreground">جارٍ التحميل...</div>
          : filteredSkills.length === 0 ? (
            <div className="col-span-3 py-16 text-center text-muted-foreground">
              <BookOpen className="mx-auto mb-3 h-10 w-10 opacity-20" />
              <p>لا توجد مهارات مسجلة</p>
            </div>
          ) : filteredSkills.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <GlassCard>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 text-lg font-black">
                    {s.skill_name?.[0] || "م"}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{s.skill_name}</p>
                    <p className="text-xs text-muted-foreground">{empName(s.employee_id)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                    s.level === "خبير"   ? "bg-purple-500/15 text-purple-400" :
                    s.level === "متقدم"  ? "bg-emerald-500/15 text-emerald-400" :
                    s.level === "متوسط"  ? "bg-blue-500/15 text-blue-400" :
                                           "bg-muted text-muted-foreground"
                  }`}>{s.level}</span>
                </div>
                {s.notes && <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Add Form Modal ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}>
              <GlassCard className="border-primary/30">
                {/* Tab switcher inside modal */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1">
                    {TABS.map(t => (
                      <button key={t.id} onClick={() => setTab(t.id)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${tab === t.id ? "gradient-primary text-white" : "glass border border-border text-muted-foreground"}`}>
                        {t.label.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setShowForm(false)} className="rounded-xl p-2 glass card-hover">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Review Form */}
                {tab === "reviews" && (
                  <form onSubmit={submitReview} className="space-y-4">
                    <h3 className="font-display text-lg font-bold">تقييم دوري جديد</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block sm:col-span-2">
                        <span className="text-xs text-muted-foreground mb-1 block">الموظف *</span>
                        <select required value={rvForm.employee_id} onChange={e => setRV(p => ({...p, employee_id: e.target.value}))}
                          className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm">
                          <option value="">اختر الموظف</option>
                          {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">الفترة</span>
                        <input value={rvForm.period} onChange={e => setRV(p => ({...p, period: e.target.value}))}
                          className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm"
                          placeholder="مثال: يوليو 2026" />
                      </label>
                    </div>
                    {[
                      { key: "overall_rating", label: "التقييم العام" },
                      { key: "attendance_rating", label: "الحضور والانضباط" },
                      { key: "performance_rating", label: "جودة الأداء" },
                      { key: "teamwork_rating", label: "العمل الجماعي" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
                        <div className="flex items-center gap-3">
                          <Stars value={rvForm[key]} onChange={v => setRV(p => ({...p, [key]: v}))} />
                          <span className={`text-sm font-bold ${RATING_COLORS[rvForm[key]]}`}>
                            {RATING_LABELS[rvForm[key]]}
                          </span>
                        </div>
                      </div>
                    ))}
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">ملاحظات</span>
                      <textarea value={rvForm.notes} onChange={e => setRV(p => ({...p, notes: e.target.value}))}
                        rows={2} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm resize-none" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">توصيات التطوير</span>
                      <textarea value={rvForm.recommendations} onChange={e => setRV(p => ({...p, recommendations: e.target.value}))}
                        rows={2} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm resize-none" />
                    </label>
                    <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                      <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">إلغاء</button>
                      <PrimaryButton type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ التقييم"}</PrimaryButton>
                    </div>
                  </form>
                )}

                {/* Goal Form */}
                {tab === "goals" && (
                  <form onSubmit={submitGoal} className="space-y-3">
                    <h3 className="font-display text-lg font-bold">إضافة هدف جديد</h3>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">الموظف *</span>
                      <select required value={goalForm.employee_id} onChange={e => setGF(p => ({...p, employee_id: e.target.value}))}
                        className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm">
                        <option value="">اختر الموظف</option>
                        {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">عنوان الهدف *</span>
                      <input required value={goalForm.title} onChange={e => setGF(p => ({...p, title: e.target.value}))}
                        className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm" placeholder="مثال: إتمام دورة Excel" />
                    </label>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">تفاصيل الهدف</span>
                      <textarea value={goalForm.description} onChange={e => setGF(p => ({...p, description: e.target.value}))}
                        rows={2} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm resize-none" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">الأولوية</span>
                        <select value={goalForm.priority} onChange={e => setGF(p => ({...p, priority: e.target.value}))}
                          className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm">
                          <option value="low">منخفضة</option>
                          <option value="medium">متوسطة</option>
                          <option value="high">عالية</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">الموعد النهائي</span>
                        <input type="date" value={goalForm.deadline} onChange={e => setGF(p => ({...p, deadline: e.target.value}))}
                          className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm" />
                      </label>
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                      <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">إلغاء</button>
                      <PrimaryButton type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "إضافة الهدف"}</PrimaryButton>
                    </div>
                  </form>
                )}

                {/* Skill Form */}
                {tab === "skills" && (
                  <form onSubmit={submitSkill} className="space-y-3">
                    <h3 className="font-display text-lg font-bold">تسجيل مهارة جديدة</h3>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">الموظف *</span>
                      <select required value={skillForm.employee_id} onChange={e => setSF(p => ({...p, employee_id: e.target.value}))}
                        className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm">
                        <option value="">اختر الموظف</option>
                        {crew.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">اسم المهارة *</span>
                        <input required value={skillForm.skill_name} onChange={e => setSF(p => ({...p, skill_name: e.target.value}))}
                          className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm" placeholder="مثال: Excel" />
                      </label>
                      <label className="block">
                        <span className="text-xs text-muted-foreground mb-1 block">المستوى</span>
                        <select value={skillForm.level} onChange={e => setSF(p => ({...p, level: e.target.value}))}
                          className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm">
                          {SKILL_LEVELS.map(l => <option key={l}>{l}</option>)}
                        </select>
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs text-muted-foreground mb-1 block">ملاحظات</span>
                      <textarea value={skillForm.notes} onChange={e => setSF(p => ({...p, notes: e.target.value}))}
                        rows={2} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm resize-none" />
                    </label>
                    <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
                      <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-bold hover:bg-muted">إلغاء</button>
                      <PrimaryButton type="submit" disabled={saving}>{saving ? "جارٍ الحفظ..." : "تسجيل المهارة"}</PrimaryButton>
                    </div>
                  </form>
                )}
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
