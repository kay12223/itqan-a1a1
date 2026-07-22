import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, BrainCircuit, Bell, ShieldCheck, UserCog, Palette,
  Globe, Moon, Sun, Mail, Smartphone, Languages, Clock, Lock, Database,
  Briefcase, CalendarDays, MapPin, Wallet, Eye, EyeOff, AlarmClock, Gauge,
  Upload, User, Camera,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { PageHeader, GlassCard } from "@/components/Kit";

function Toggle({ on, onChange, testId }) {
  return (
    <button
      type="button" onClick={() => onChange(!on)} data-testid={testId}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "gradient-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-0.5" : "right-0.5"}`} />
    </button>
  );
}

function NumberField({ label, icon: Icon, value, onChange, min = 0, max, suffix = "" }) {
  return (
    <div className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Icon className="h-5 w-5 text-violet-400" />
        </span>
        <div>
          <p className="text-sm font-bold">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number" value={value} min={min} max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 rounded-xl border border-input bg-background/60 px-2 py-1 text-center text-sm font-bold"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { company, setCompany, user, loadMe } = useAuth();
  const { theme, setTheme } = useTheme();
  const [s, setS] = useState({});
  const [activeTab, setActiveTab] = useState("general");
  const [avatar, setAvatar] = useState(user?.avatar_url || null);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const onAvatar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("الصورة كبيرة (الحد 2 ميجا)"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result);
    reader.readAsDataURL(f);
  };

  const saveAvatar = async () => {
    setSavingAvatar(true);
    try {
      await api.put("/auth/update-profile", { avatar_url: avatar });
      await loadMe();
      toast.success("تم حفظ الصورة الشخصية ✅");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSavingAvatar(false); }
  };

  useEffect(() => {
    if (company?.settings) setS({ ...{ overtime_rate: 1.5, leave_quota_days: 21, grace_minutes: 15, work_days_per_month: 26, currency: "EGP" }, ...company.settings });
  }, [company]);

  const update = async (patch) => {
    const next = { ...s, ...patch };
    setS(next);
    try {
      const { data } = await api.put("/company", { settings: patch });
      setCompany((c) => ({ ...c, ...data }));
      toast.success("تم الحفظ ✅");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const tabs = [
    { id: "general", label: "عام", icon: SettingsIcon },
    { id: "employees", label: "الموظفون", icon: UserCog },
    { id: "attendance", label: "الحضور", icon: Clock },
    { id: "financial", label: "مالية", icon: Wallet },
    { id: "appearance", label: "المظهر", icon: Palette },
  ];

  const generalRows = [
    { key: "ai_monitor_enabled", icon: BrainCircuit, title: "المراقب الذكي", desc: "تفعيل مراقبة النشاط والتنبيهات التلقائية", color: "text-cyan-400" },
    { key: "notifications", icon: Bell, title: "الإشعارات", desc: "استقبال تنبيهات النظام", color: "text-amber-400" },
    { key: "two_factor", icon: ShieldCheck, title: "المصادقة الثنائية", desc: "طبقة حماية إضافية عند الدخول", color: "text-emerald-400" },
    { key: "email_alerts", icon: Mail, title: "تنبيهات البريد", desc: "إرسال نسخة من التنبيهات للبريد", color: "text-blue-400" },
    { key: "sms_alerts", icon: Smartphone, title: "تنبيهات SMS", desc: "إرسال التنبيهات الحرجة برسالة نصية", color: "text-rose-400" },
    { key: "audit_log", icon: Database, title: "سجل التدقيق", desc: "تسجيل كل حركة داخل النظام", color: "text-violet-400" },
    { key: "auto_backup", icon: Lock, title: "نسخ احتياطي تلقائي", desc: "حفظ نسخة من بياناتك دورياً", color: "text-teal-400" },
  ];

  const employeeRows = [
    { key: "allow_employee_self_edit", icon: UserCog, title: "تعديل الموظف لبياناته", desc: "السماح للموظف بتعديل بياناته الشخصية", color: "text-cyan-400" },
    { key: "allow_employee_leave_request", icon: CalendarDays, title: "طلب إجازة من الموظف", desc: "السماح للموظف بتقديم طلب إجازة", color: "text-emerald-400" },
    { key: "show_salary_to_employee", icon: Eye, title: "عرض الراتب للموظف", desc: "السماح للموظف برؤية راتبه الصافي", color: "text-amber-400" },
  ];

  const attendanceRows = [
    { key: "allow_late_check_grace", icon: AlarmClock, title: "فترة سماح للحضور المتأخر", desc: "السماح بفترة سماح قبل تسجيل التأخير", color: "text-amber-400" },
    { key: "require_location_checkin", icon: MapPin, title: "تحديد الموقع عند الحضور", desc: "يشترط إرسال الموقع الجغرافي عند تسجيل الحضور", color: "text-rose-400" },
    { key: "lock_after_hours", icon: Clock, title: "قفل النظام بعد الدوام", desc: "منع الدخول خارج ساعات العمل", color: "text-violet-400" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="الإعدادات" subtitle="تحكّم كامل في سلوك منصتك" icon={SettingsIcon} />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
              activeTab === t.id ? "gradient-primary text-white void-glow" : "glass card-hover text-muted-foreground"
            }`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Manager Avatar Card */}
          <GlassCard className="lg:col-span-2">
            <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-bold">
              <Camera className="h-5 w-5 text-violet-400" /> صورتي الشخصية
            </h3>
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-2xl gradient-primary flex items-center justify-center text-3xl font-black text-white">
                  {avatar
                    ? <img src={avatar} alt="" className="h-full w-full object-cover" />
                    : <User className="h-10 w-10 text-white/70" />}
                </div>
                <label className="absolute -bottom-2 -left-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl gradient-primary text-white shadow-lg hover:opacity-90 transition">
                  <Upload className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={onAvatar} />
                </label>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">المدير · {user?.username}</p>
                <p className="text-xs text-muted-foreground/60 mt-2">هذه الصورة ستظهر للموظفين في الشات وجميع الأماكن داخل المنصة</p>
                <button onClick={saveAvatar} disabled={savingAvatar || avatar === user?.avatar_url}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-40 transition">
                  {savingAvatar ? "جارٍ الحفظ..." : "💾 حفظ الصورة"}
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">التفضيلات العامة</h3>
            <div className="space-y-1">
              {generalRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><r.icon className={`h-5 w-5 ${r.color}`} /></span>
                    <div>
                      <p className="text-sm font-bold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                  <Toggle on={!!s[r.key]} onChange={(v) => update({ [r.key]: v })} testId={`toggle-${r.key}`} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Globe className="h-5 w-5 text-cyan-400" /> الإقليم والعملة</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"><Languages className="h-4 w-4" /> العملة الافتراضية</span>
                <select value={s.currency || "EGP"} onChange={(e) => update({ currency: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
                  <option value="EGP">جنيه مصري (EGP)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="AED">درهم إماراتي (AED)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                  <option value="EUR">يورو (EUR)</option>
                  <option value="GBP">جنيه إسترليني (GBP)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" /> أيام نهاية الأسبوع</span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { v: "friday", l: "الجمعة" }, { v: "saturday", l: "السبت" },
                    { v: "sunday", l: "الأحد" }, { v: "monday", l: "الاثنين" },
                  ].map(({ v, l }) => {
                    const active = (s.weekend_days || []).includes(v);
                    return (
                      <button key={v} onClick={() => {
                        const days = s.weekend_days || [];
                        update({ weekend_days: active ? days.filter((d) => d !== v) : [...days, v] });
                      }} className={`rounded-xl px-3 py-1.5 text-xs font-bold border transition ${active ? "gradient-primary text-white border-transparent" : "border-border"}`}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </label>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "employees" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">صلاحيات الموظفين</h3>
            <div className="space-y-1">
              {employeeRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><r.icon className={`h-5 w-5 ${r.color}`} /></span>
                    <div>
                      <p className="text-sm font-bold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                  <Toggle on={!!s[r.key]} onChange={(v) => update({ [r.key]: v })} testId={`toggle-${r.key}`} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">حصص الموظفين</h3>
            <div className="space-y-1">
              <NumberField label="حصة الإجازة السنوية" icon={CalendarDays}
                value={s.leave_quota_days ?? 21} suffix="يوم"
                onChange={(v) => update({ leave_quota_days: v })} />
              <NumberField label="أيام العمل الشهرية" icon={Briefcase}
                value={s.work_days_per_month ?? 26} suffix="يوم"
                onChange={(v) => update({ work_days_per_month: v })} />
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">إعدادات الحضور</h3>
            <div className="space-y-1">
              {attendanceRows.map((r) => (
                <div key={r.key} className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><r.icon className={`h-5 w-5 ${r.color}`} /></span>
                    <div>
                      <p className="text-sm font-bold">{r.title}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                  <Toggle on={!!s[r.key]} onChange={(v) => update({ [r.key]: v })} testId={`toggle-${r.key}`} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">قيم الحضور</h3>
            <div className="space-y-1">
              <NumberField label="دقائق فترة السماح" icon={AlarmClock}
                value={s.grace_minutes ?? 15} suffix="دقيقة" max={60}
                onChange={(v) => update({ grace_minutes: v })} />
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "financial" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">إعدادات مالية</h3>
            <div className="space-y-1">
              <NumberField label="معدل الأوفرتايم" icon={Gauge}
                value={s.overtime_rate ?? 1.5} suffix="x"
                onChange={(v) => update({ overtime_rate: v })} />
              <NumberField label="أيام العمل في الشهر" icon={CalendarDays}
                value={s.work_days_per_month ?? 26} suffix="يوم"
                onChange={(v) => update({ work_days_per_month: v })} />
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="mb-4 font-display text-lg font-bold">خصوصية الرواتب</h3>
            <div className="space-y-1">
              <div className="flex items-center justify-between rounded-xl p-3 hover:bg-muted/40">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted"><Eye className="h-5 w-5 text-amber-400" /></span>
                  <div>
                    <p className="text-sm font-bold">عرض الراتب للموظف</p>
                    <p className="text-xs text-muted-foreground">هل يرى الموظف راتبه الصافي في لوحته؟</p>
                  </div>
                </div>
                <Toggle on={!!s.show_salary_to_employee} onChange={(v) => update({ show_salary_to_employee: v })} />
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === "appearance" && (
        <GlassCard>
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Palette className="h-5 w-5 text-violet-400" /> المظهر</h3>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            <button onClick={() => setTheme("void")}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 ${theme === "void" ? "gradient-primary border-transparent text-white" : "border-border"}`}>
              <Moon className="h-6 w-6" /> <span className="text-sm font-bold">الفراغ</span>
            </button>
            <button onClick={() => setTheme("clouds")}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 ${theme === "clouds" ? "gradient-primary border-transparent text-white" : "border-border"}`}>
              <Sun className="h-6 w-6" /> <span className="text-sm font-bold">الغيوم</span>
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
