import { useEffect, useState } from "react";
import { Building2, Wallet, Vault, CreditCard, Boxes, BarChart3, AlertCircle } from "lucide-react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";
import FeatureLock from "@/components/FeatureLock";

export default function CompanyStats() {
  const { company, refreshCompany } = useAuth();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  const hasStats = !!company?.addons?.company_stats?.unlocked;

  useEffect(() => { refreshCompany(); }, [refreshCompany]);

  useEffect(() => {
    if (!hasStats) { setLoading(false); return; }
    api.get("/company/stats").then(r => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [hasStats]);

  // ── Subscription / add-on gate ───────────────────────────────────────────
  if (!hasStats) {
    return (
      <FeatureLock
        pageTitle="إحصائيات الشركة"
        pageSubtitle="لمحة شاملة عن موارد الشركة وأقسامها"
        icon={Building2}
        title="إحصائيات الشركة للمشتركين فقط"
        description="لوحة الإحصائيات الكاملة (البنك، الخزينة، سجلات المدير، المعدات) متاحة للمشتركين أو لمن اشترى هذه الإضافة. قم بالترقية للوصول إليها."
        perks={["البنك والمالية", "الخزينة وسجلات المدير", "المعدات والمشاريع النشطة"]}
      />
    );
  }
  // ────────────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-12 text-center text-muted-foreground">جارٍ تحميل إحصائيات الشركة...</div>;
  if (!data)   return <div className="p-12 text-center text-red-400">تعذّر تحميل البيانات.</div>;

  const { company: companyStats, bank, petty_cash, manager_records, operations } = data;

  return (
    <div>
      <PageHeader title="إحصائيات الشركة" subtitle="لمحة شاملة عن موارد الشركة وأقسامها" icon={Building2} />

      {/* Company info */}
      <GlassCard className="mb-6">
        <div className="flex items-center gap-4">
          {companyStats.logo_url
            ? <img src={companyStats.logo_url} alt="logo" className="h-16 w-16 rounded-2xl object-cover" />
            : <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-2xl font-black text-white">{companyStats.name?.[0]}</div>}
          <div>
            <h2 className="text-xl font-black">{companyStats.name}</h2>
            {companyStats.address && <p className="text-sm text-muted-foreground">📍 {companyStats.address}</p>}
            {companyStats.phone  && <p className="text-sm text-muted-foreground">📞 {companyStats.phone}</p>}
            <div className="mt-2 flex gap-3">
              <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${companyStats.is_premium ? "gradient-primary text-white" : "glass text-muted-foreground"}`}>
                {companyStats.is_premium ? "⭐ اشتراك مفعّل" : "اشتراك مجاني"}
              </span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Bank stats */}
      <h3 className="mb-3 font-display text-lg font-bold flex items-center gap-2">
        <Wallet className="h-5 w-5 text-cyan-400" /> البنك والمالية
      </h3>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي الإيرادات" value={`${bank.total_income.toLocaleString()} ج.م`}
          icon={Wallet} accent="from-emerald-500 to-green-500" />
        <StatCard label="إجمالي المصروفات" value={`${bank.total_expense.toLocaleString()} ج.م`}
          icon={Wallet} accent="from-red-500 to-rose-500" />
        <StatCard label="الصافي" value={`${bank.net.toLocaleString()} ج.م`}
          icon={BarChart3} accent={bank.net >= 0 ? "from-cyan-500 to-blue-500" : "from-red-500 to-rose-500"} />
      </div>

      {/* Petty cash & manager records */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-bold flex items-center gap-2">
            <Vault className="h-5 w-5 text-violet-400" /> الخزينة
          </h3>
          <div className="rounded-2xl border border-violet-400/30 bg-violet-400/10 p-6 text-center">
            <p className="text-4xl font-black text-violet-400">{petty_cash.balance.toLocaleString()}</p>
            <p className="mt-1 text-sm text-muted-foreground">الرصيد الحالي (ج.م)</p>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-4 font-display text-lg font-bold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-amber-400" /> سجلات المدير
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-center">
              <p className="text-2xl font-black text-red-400">{manager_records.active_debts.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">ديون نشطة (ج.م)</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-4 text-center">
              <p className="text-2xl font-black text-cyan-400">{manager_records.active_needs_count}</p>
              <p className="text-xs text-muted-foreground">احتياجات معلقة</p>
            </div>
          </div>
          {manager_records.active_needs_count > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              يوجد {manager_records.active_needs_count} احتياج معلق — راجع سجلات المدير
            </div>
          )}
        </GlassCard>
      </div>

      {/* Operations */}
      <h3 className="mb-3 font-display text-lg font-bold flex items-center gap-2">
        <Boxes className="h-5 w-5 text-cyan-400" /> العمليات والمعدات
      </h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="عدد المعدات" value={operations.equipment_count}
          icon={Boxes} accent="from-violet-500 to-purple-500" />
        <StatCard label="قيمة المعدات" value={`${operations.total_equipment_value.toLocaleString()} ج.م`}
          icon={Boxes} accent="from-amber-500 to-orange-500" />
        <StatCard label="المشاريع النشطة" value={operations.active_projects}
          icon={BarChart3} accent="from-cyan-500 to-blue-500" />
      </div>
    </div>
  );
}
