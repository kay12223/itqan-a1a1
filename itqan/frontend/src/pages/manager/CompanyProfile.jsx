import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Building2, Save, Upload } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Field, PrimaryButton } from "@/components/Kit";
import StorageBar from "@/components/StorageBar";

const readFile = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });

export default function CompanyProfile() {
  const { company, setCompany } = useAuth();
  const [form, setForm] = useState({ name: "", industry: "", phone: "", address: "", logo_url: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (company) setForm({ name: company.name || "", industry: company.industry || "", phone: company.phone || "", address: company.address || "", logo_url: company.logo_url || null });
  }, [company]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await api.put("/company", form);
      setCompany((c) => ({ ...c, ...data }));
      toast.success("تم حفظ ملف الشركة");
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  const onLogo = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { toast.error("الشعار كبير (الحد 1.5 ميجا)"); return; }
    setForm({ ...form, logo_url: await readFile(f) });
  };

  return (
    <div>
      <PageHeader title="ملف الشركة" subtitle="هوية شركتك في الفراغ" icon={Building2} />
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl gradient-primary text-2xl font-black text-white">
                {form.logo_url ? <img src={form.logo_url} className="h-full w-full object-cover" alt="" /> : (form.name?.[0] || "؟")}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover">
                <Upload className="h-4 w-4" /> رفع شعار الشركة
                <input type="file" accept="image/*" className="hidden" onChange={onLogo} data-testid="logo-upload" />
              </label>
            </div>
            <Field label="اسم الشركة" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="company-name" />
            <Field label="المجال / النشاط" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="رقم الهاتف" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Field label="العنوان" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <PrimaryButton type="submit" disabled={saving} data-testid="save-company"><Save className="h-4 w-4" /> {saving ? "جارٍ..." : "حفظ"}</PrimaryButton>
          </form>
        </GlassCard>

        <div className="space-y-5">
          <GlassCard>
            <h3 className="mb-3 font-display font-bold">المساحة التخزينية</h3>
            <StorageBar used={company?.storage_used_mb || 0} limit={company?.storage_limit_mb || 100} />
            <p className="mt-3 text-xs text-muted-foreground">لزيادة المساحة استخدم «محرك الفراغ».</p>
          </GlassCard>
          <GlassCard>
            <h3 className="mb-3 font-display font-bold">ملخص</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">الموظفون</span><span className="font-bold">{company?.crew_count ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">حد الحسابات</span><span className="font-bold">{company?.account_limit}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الاشتراك</span><span className="font-bold">{company?.is_premium ? "مُفعّل" : "مجاني"}</span></div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
