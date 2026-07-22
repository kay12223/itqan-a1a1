import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Users, Plus, Trash2, Pencil, Minus, PlusCircle, DollarSign, Eye, Power, KeyRound,
  Lock, FileText,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

export default function Crew() {
  const { refreshCompany } = useAuth();
  const navigate = useNavigate();
  const [crew, setCrew] = useState([]);
  const [limit, setLimit] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(null);
  const [editOpen, setEditOpen] = useState(null);
  const [viewOpen, setViewOpen] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", password: "", job_title: "", monthly_salary: "", phone: "" });
  const [tx, setTx] = useState({ type: "deduction", amount: "", reason: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [crewRes, companyRes] = await Promise.all([
      api.get("/crew").catch(() => ({ data: [] })),
      api.get("/company").catch(() => ({ data: {} })),
    ]);
    setCrew(crewRes.data);
    setLimit(companyRes.data?.account_limit ?? null);
  };

  useEffect(() => { load(); }, []);

  const atLimit = limit !== null && crew.length >= limit;

  const createCrew = async (e) => {
    e.preventDefault();
    if (atLimit) { toast.error(`وصلت للحد الأقصى (${limit} موظف)`); return; }
    setSaving(true);
    try {
      await api.post("/crew", { ...form, monthly_salary: Number(form.monthly_salary) || 0 });
      toast.success("تم إنشاء حساب الموظف");
      setAddOpen(false);
      setForm({ name: "", username: "", password: "", job_title: "", monthly_salary: "", phone: "" });
      load();
      refreshCompany();
    } catch (e) {
      toast.error(apiErr(e.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const submitTx = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/crew/${txOpen.id}/transaction`, { ...tx, amount: Number(tx.amount) || 0 });
      toast.success("تم تسجيل العملية");
      setTxOpen(null);
      setTx({ type: "deduction", amount: "", reason: "" });
      load();
    } catch (e) {
      toast.error(apiErr(e.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: editOpen.name, job_title: editOpen.job_title, phone: editOpen.phone,
      monthly_salary: Number(editOpen.monthly_salary) || 0,
    };
    if (editOpen.newPassword) payload.password = editOpen.newPassword;
    if (editOpen.avatar_url) payload.avatar_url = editOpen.avatar_url;
    try {
      await api.put(`/crew/${editOpen.id}`, payload);
      toast.success("تم التحديث");
      setEditOpen(null);
      load();
    } catch (e) {
      toast.error(apiErr(e.response?.data?.detail));
    } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    await api.put(`/crew/${u.id}`, { is_active: !u.is_active });
    load();
  };

  const resetDevice = async (u) => {
    if (!window.confirm(`إعادة ضبط الجهاز المسجّل لـ ${u.name}؟ سيتمكن من تسجيل الحضور من أي جهاز جديد يستخدمه أولاً بعد ذلك.`)) return;
    try {
      await api.put(`/crew/${u.id}`, { reset_device: true });
      toast.success("تم إعادة ضبط الجهاز");
      setViewOpen(null);
      load();
    } catch (e) {
      toast.error(apiErr(e.response?.data?.detail));
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`حذف ${u.name} نهائياً؟`)) return;
    await api.delete(`/crew/${u.id}`);
    toast.success("تم الحذف");
    load();
    refreshCompany();
  };

  const forceCheckout = async (u) => {
    if (!window.confirm(`إنهاء يوم عمل ${u.name} الآن؟ سيتم تسجيل انصرافه فوراً.`)) return;
    try {
      const { data } = await api.post(`/crew/${u.id}/force-checkout`);
      toast.success(data.already ? data.message : "✅ تم إنهاء يوم العمل");
      setViewOpen(null);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const forceCheckin = async (u) => {
    try {
      const { data } = await api.post(`/crew/${u.id}/force-checkin`);
      toast.success(data.already ? data.message : "✅ تم تسجيل حضوره");
      setViewOpen(null);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
  };

  const onAvatar = async (e, setter) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { toast.error("الصورة كبيرة (الحد 1.5 ميجا)"); return; }
    const url = await readFile(f);
    setter(url);
  };

  const pct = limit ? Math.min((crew.length / limit) * 100, 100) : 0;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div>
      <PageHeader title="إدارة الموظفين" subtitle="أنشئ حسابات موظفيك وتحكّم بهم بالكامل" icon={Users}>
        <button
          onClick={() => atLimit ? toast.error(`وصلت للحد الأقصى — الخطة تسمح بـ ${limit} موظف فقط`) : setAddOpen(true)}
          disabled={atLimit}
          className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
            atLimit
              ? "cursor-not-allowed border border-red-400/30 bg-red-400/10 text-red-400"
              : "gradient-primary text-white void-glow hover:opacity-90"
          }`}
          data-testid="add-crew-btn"
        >
          {atLimit ? <Lock className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {atLimit ? `الحد الأقصى (${limit})` : "إضافة موظف"}
        </button>
      </PageHeader>

      {/* Employee counter */}
      {limit !== null && (
        <div className={`mb-4 rounded-2xl border px-5 py-4 ${atLimit ? "border-red-400/30 bg-red-400/5" : "border-border glass"}`}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-bold">
              <Users className="h-4 w-4 text-primary" />
              الموظفون
            </span>
            <span className={`font-black text-lg ${atLimit ? "text-red-400" : pct >= 80 ? "text-amber-400" : "text-emerald-400"}`}>
              {crew.length} / {limit}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {atLimit && (
            <p className="mt-2 text-xs text-red-400">
              🔒 وصلت للحد الأقصى — لإضافة موظفين تواصل مع الدعم للترقية
            </p>
          )}
          {!atLimit && pct >= 80 && (
            <p className="mt-2 text-xs text-amber-400">
              ⚠️ اقتربت من الحد الأقصى — متبقي {limit - crew.length} موظف
            </p>
          )}
        </div>
      )}

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="crew-table">
            <thead>
              <tr className="border-b border-border text-right text-xs text-muted-foreground">
                <th className="p-3">العضو</th>
                <th className="p-3">المسمى</th>
                <th className="p-3">الراتب</th>
                <th className="p-3">الخصومات</th>
                <th className="p-3">الإضافات</th>
                <th className="p-3">الصافي</th>
                <th className="p-3">الحالة</th>
                <th className="p-3">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {crew.map((u) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30" data-testid={`crew-row-${u.id}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full gradient-primary text-xs text-white">
                        {u.avatar_url ? <img src={u.avatar_url} className="h-full w-full object-cover" alt="" /> : u.name[0]}
                      </div>
                      <div>
                        <p className="font-bold">{u.name}</p>
                        <p className="text-xs text-muted-foreground font-mono-x">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">{u.job_title || "—"}</td>
                  <td className="p-3 font-mono-x">{u.monthly_salary?.toLocaleString()}</td>
                  <td className="p-3 font-mono-x text-red-400">{u.total_deductions?.toLocaleString()}</td>
                  <td className="p-3 font-mono-x text-emerald-400">{u.total_additions?.toLocaleString()}</td>
                  <td className="p-3 font-mono-x font-bold gradient-text">{(u.monthly_salary + u.total_additions - u.total_deductions).toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.is_active ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      {u.is_active ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button title="الملف الكامل" onClick={() => navigate(`/app/crew/${u.id}`)} className="rounded-lg p-1.5 hover:bg-muted text-cyan-400"><FileText className="h-4 w-4" /></button>
                      <button title="تفاصيل" onClick={() => setViewOpen(u)} className="rounded-lg p-1.5 hover:bg-muted" data-testid={`view-${u.id}`}><Eye className="h-4 w-4" /></button>
                      <button title="مالية" onClick={() => setTxOpen(u)} className="rounded-lg p-1.5 hover:bg-muted" data-testid={`tx-${u.id}`}><DollarSign className="h-4 w-4 text-cyan-400" /></button>
                      <button title="تعديل" onClick={() => setEditOpen({ ...u, newPassword: "" })} className="rounded-lg p-1.5 hover:bg-muted" data-testid={`edit-${u.id}`}><Pencil className="h-4 w-4" /></button>
                      <button title="تفعيل/تعطيل" onClick={() => toggleActive(u)} className="rounded-lg p-1.5 hover:bg-muted"><Power className={`h-4 w-4 ${u.is_active ? "text-emerald-400" : "text-muted-foreground"}`} /></button>
                      <button title="حذف" onClick={() => remove(u)} className="rounded-lg p-1.5 hover:bg-muted" data-testid={`delete-${u.id}`}><Trash2 className="h-4 w-4 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {crew.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">لا يوجد أعضاء بعد. ابدأ بإضافة موظف ✨</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="إضافة موظف" testId="add-crew-modal">
        <form onSubmit={createCrew} className="space-y-4">
          <Field label="الاسم الكامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="crew-name" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم المستخدم (للدخول)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required data-testid="crew-username" />
            <Field label="كلمة السر" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required data-testid="crew-password" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المسمى الوظيفي" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            <Field label="الراتب الشهري" type="number" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} />
          </div>
          <Field label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="crew-submit">{saving ? "جارٍ..." : "إنشاء الحساب"}</PrimaryButton>
        </form>
      </Modal>

      {/* Transaction modal */}
      <Modal open={!!txOpen} onClose={() => setTxOpen(null)} title={`مالية: ${txOpen?.name || ""}`} testId="tx-modal">
        <form onSubmit={submitTx} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "deduction", label: "خصم", icon: Minus },
              { id: "addition", label: "إضافة", icon: PlusCircle },
              { id: "salary", label: "تعديل الراتب", icon: DollarSign },
            ].map((t) => (
              <button type="button" key={t.id} onClick={() => setTx({ ...tx, type: t.id })}
                className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs ${tx.type === t.id ? "gradient-primary border-transparent text-white" : "border-border"}`}>
                <t.icon className="h-4 w-4" /> {t.label}
              </button>
            ))}
          </div>
          <Field label="المبلغ" type="number" value={tx.amount} onChange={(e) => setTx({ ...tx, amount: e.target.value })} required data-testid="tx-amount" />
          <Field label="السبب / ملاحظة" value={tx.reason} onChange={(e) => setTx({ ...tx, reason: e.target.value })} />
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="tx-submit">{saving ? "جارٍ..." : "تسجيل"}</PrimaryButton>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editOpen} onClose={() => setEditOpen(null)} title={`تعديل: ${editOpen?.name || ""}`} testId="edit-modal">
        {editOpen && (
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full gradient-primary text-white">
                {editOpen.avatar_url ? <img src={editOpen.avatar_url} className="h-full w-full object-cover" alt="" /> : editOpen.name[0]}
              </div>
              <label className="cursor-pointer rounded-xl glass px-3 py-2 text-sm card-hover">
                صورة الموظف
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e, (u) => setEditOpen({ ...editOpen, avatar_url: u }))} />
              </label>
            </div>
            <Field label="الاسم" value={editOpen.name} onChange={(e) => setEditOpen({ ...editOpen, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="المسمى" value={editOpen.job_title || ""} onChange={(e) => setEditOpen({ ...editOpen, job_title: e.target.value })} />
              <Field label="الراتب" type="number" value={editOpen.monthly_salary} onChange={(e) => setEditOpen({ ...editOpen, monthly_salary: e.target.value })} />
            </div>
            <Field label="رقم الهاتف" value={editOpen.phone || ""} onChange={(e) => setEditOpen({ ...editOpen, phone: e.target.value })} />
            <Field label="كلمة سر جديدة (اختياري)" value={editOpen.newPassword} onChange={(e) => setEditOpen({ ...editOpen, newPassword: e.target.value })} placeholder="اتركها فارغة للإبقاء" />
            <PrimaryButton type="submit" disabled={saving} className="w-full">{saving ? "جارٍ..." : "حفظ التعديلات"}</PrimaryButton>
          </form>
        )}
      </Modal>

      {/* View modal */}
      <Modal open={!!viewOpen} onClose={() => setViewOpen(null)} title="تفاصيل العضو" testId="view-modal">
        {viewOpen && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl gradient-primary text-2xl text-white">
                {viewOpen.avatar_url ? <img src={viewOpen.avatar_url} className="h-full w-full object-cover" alt="" /> : viewOpen.name[0]}
              </div>
              <div>
                <p className="font-display text-lg font-bold">{viewOpen.name}</p>
                <p className="text-sm text-muted-foreground">{viewOpen.job_title || "—"}</p>
                <p className="text-xs font-mono-x text-cyan-400 flex items-center gap-1"><KeyRound className="h-3 w-3" /> @{viewOpen.username}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["الراتب", `${viewOpen.monthly_salary?.toLocaleString()} ج.م`],
                ["الخصومات", `${viewOpen.total_deductions?.toLocaleString()} ج.م`],
                ["الإضافات", `${viewOpen.total_additions?.toLocaleString()} ج.م`],
                ["الصافي", `${(viewOpen.monthly_salary + viewOpen.total_additions - viewOpen.total_deductions).toLocaleString()} ج.م`],
                ["الهاتف", viewOpen.phone || "—"],
                ["الحالة", viewOpen.is_active ? "نشط" : "معطّل"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-border p-3">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-bold">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="mb-2 text-xs text-muted-foreground">جهاز تسجيل الحضور المسجّل</p>
              {viewOpen.registered_device_id ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{viewOpen.registered_device_label || "جهاز غير محدد"}</p>
                  <button
                    type="button"
                    onClick={() => resetDevice(viewOpen)}
                    className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-400/20"
                  >
                    إعادة ضبط الجهاز
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لم يُسجَّل بعد — سيُربط تلقائياً عند أول تسجيل حضور</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
