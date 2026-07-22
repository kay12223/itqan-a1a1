import { useState } from "react";
import { toast } from "sonner";
import { User, Upload, Save } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Field, PrimaryButton } from "@/components/Kit";

const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

export default function Profile() {
  const { user, company, loadMe } = useAuth();
  const [avatar, setAvatar] = useState(user?.avatar_url || null);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);

  const allowed = company?.settings?.allow_employee_self_edit;

  const onAvatar = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { toast.error("الصورة كبيرة (الحد 1.5 ميجا)"); return; }
    setAvatar(await readFile(f));
  };

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.put(`/crew/${user.id}`, { name, phone, avatar_url: avatar });
      await loadMe();
      toast.success("تم حفظ ملفك الشخصي");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="ملفي الشخصي" subtitle="بياناتك داخل المنصة" icon={User} />
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl gradient-primary text-2xl font-black text-white">
                {avatar ? <img src={avatar} className="h-full w-full object-cover" alt="" /> : (name?.[0] || "؟")}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover">
                <Upload className="h-4 w-4" /> صورتي الشخصية
                <input type="file" accept="image/*" className="hidden" onChange={onAvatar} data-testid="avatar-upload" />
              </label>
            </div>
            <Field label="الاسم" value={name} onChange={(e) => setName(e.target.value)} disabled={!allowed} data-testid="profile-name" />
            <Field label="رقم الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!allowed} />
            {!allowed && <p className="text-xs text-amber-400">تعديل البيانات مقيّد بإذن المدير — يمكنك تحديث الصورة فقط.</p>}
            <PrimaryButton type="submit" disabled={saving} data-testid="save-profile"><Save className="h-4 w-4" /> {saving ? "جارٍ..." : "حفظ"}</PrimaryButton>
          </form>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 font-display font-bold">معلومات الحساب</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">اسم المستخدم</span><span className="font-mono-x font-bold">@{user?.username}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">المسمى</span><span className="font-bold">{user?.job_title || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">الشركة</span><span className="font-bold">{company?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">الراتب</span><span className="font-bold">{user?.monthly_salary?.toLocaleString()} $</span></div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
