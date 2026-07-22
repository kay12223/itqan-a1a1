import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Building2, Plus, Trash2, TrendingUp, TrendingDown, Wallet, Users,
  Receipt, ArrowUpCircle, ArrowDownCircle, CreditCard, User,
} from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard, Modal, Field, PrimaryButton } from "@/components/Kit";

const TYPES = [
  { id: "income", label: "دخل / إيراد", icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/30" },
  { id: "expense", label: "مصروف عام", icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10 border-red-400/30" },
  { id: "advance", label: "عربون / دفعة مقدمة", icon: CreditCard, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/30" },
  { id: "personal_expense", label: "مصروف شخصي", icon: User, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/30" },
];

const typeConfig = Object.fromEntries(TYPES.map((t) => [t.id, t]));

const EMPTY_FORM = {
  record_type: "expense",
  amount: "",
  description: "",
  person_name: "",
  company_name: "",
  owner_name: "",
  recipient_name: "",
  record_date: new Date().toISOString().split("T")[0],
  note: "",
};

export default function Bank() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = () => {
    api.get("/bank").then((r) => setRecords(r.data)).catch(() => {});
    api.get("/bank/summary").then((r) => setSummary(r.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const F = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.description) { toast.error("اسم وقيمة المعاملة مطلوبان"); return; }
    setSaving(true);
    try {
      await api.post("/bank", { ...form, amount: Number(form.amount) });
      toast.success("تمت إضافة المعاملة");
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/bank/${id}`);
      toast.success("تم الحذف");
      load();
    } catch (e) { toast.error("فشل الحذف"); }
  };

  const filtered = filter === "all" ? records : records.filter((r) => r.record_type === filter);

  const fmt = (v) => `${(v || 0).toLocaleString()} ج.م`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="البنك والمصروفات"
        subtitle="سجّل كل دخل ومصروف وعربون ومصروف شخصي للشركة والموظفين"
        icon={Building2}
      />

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="إجمالي الدخل" value={fmt(summary?.total_income)} icon={TrendingUp} accent="from-emerald-500 to-green-500" />
        <StatCard label="إجمالي المصروفات" value={fmt(summary?.total_expense)} icon={TrendingDown} accent="from-red-500 to-rose-500" />
        <StatCard label="إجمالي العربون" value={fmt(summary?.total_advance)} icon={CreditCard} accent="from-amber-500 to-orange-500" />
        <StatCard label="مصاريف شخصية" value={fmt(summary?.total_personal)} icon={User} accent="from-violet-500 to-fuchsia-500" />
      </div>

      {/* Net Balance */}
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">الرصيد الصافي</p>
            <p className={`font-display text-3xl font-black ${(summary?.net_balance || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {fmt(summary?.net_balance)}
            </p>
          </div>
          <PrimaryButton onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> إضافة معاملة
          </PrimaryButton>
        </div>
      </GlassCard>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${filter === "all" ? "gradient-primary text-white" : "glass text-muted-foreground card-hover"}`}
        >
          الكل ({records.length})
        </button>
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${filter === t.id ? "gradient-primary text-white" : "glass text-muted-foreground card-hover"}`}
          >
            <t.icon className="h-3.5 w-3.5" /> {t.label} ({records.filter((r) => r.record_type === t.id).length})
          </button>
        ))}
      </div>

      {/* Records Table */}
      <GlassCard>
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Wallet className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-muted-foreground">لا توجد معاملات بعد</p>
              <button onClick={() => setOpen(true)} className="mt-3 text-sm text-primary hover:underline">أضف أول معاملة</button>
            </div>
          ) : (
            filtered.map((r, i) => {
              const cfg = typeConfig[r.record_type] || TYPES[0];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-start gap-4 rounded-2xl border p-4 ${cfg.bg}`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/60 ${cfg.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{r.description}</p>
                        <p className="text-xs text-muted-foreground">{cfg.label}</p>
                      </div>
                      <p className={`font-display text-xl font-black ${cfg.color}`}>{r.amount.toLocaleString()} ج.م</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {r.person_name && <span>الشخص: <strong>{r.person_name}</strong></span>}
                      {r.company_name && <span>الشركة: <strong>{r.company_name}</strong></span>}
                      {r.owner_name && <span>صاحبها: <strong>{r.owner_name}</strong></span>}
                      {r.recipient_name && <span>المستلم: <strong>{r.recipient_name}</strong></span>}
                      {r.record_date && <span>التاريخ: <strong>{r.record_date}</strong></span>}
                      {r.added_by && <span>أضافه: <strong>{r.added_by}</strong></span>}
                    </div>
                    {r.note && <p className="mt-1 text-xs text-muted-foreground">ملاحظة: {r.note}</p>}
                  </div>
                  <button onClick={() => del(r.id)} className="text-muted-foreground hover:text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })
          )}
        </div>
      </GlassCard>

      {/* Add Modal */}
      <Modal open={open} onClose={() => { setOpen(false); setForm(EMPTY_FORM); }} title="إضافة معاملة مالية">
        <form onSubmit={submit} className="space-y-4">
          {/* Type Selector */}
          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">نوع المعاملة</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => F("record_type", t.id)}
                  className={`flex items-center gap-2 rounded-xl border p-3 text-sm font-bold transition ${
                    form.record_type === t.id ? "gradient-primary border-transparent text-white" : "border-border glass"
                  }`}
                >
                  <t.icon className="h-4 w-4" /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="الوصف / الاسم *" value={form.description} onChange={(e) => F("description", e.target.value)} required placeholder="مثال: إيجار مكتب" />
            <Field label="المبلغ (ج.م) *" type="number" value={form.amount} onChange={(e) => F("amount", e.target.value)} required placeholder="0" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الشخص" value={form.person_name} onChange={(e) => F("person_name", e.target.value)} placeholder="مثال: أحمد محمد" />
            <Field label="اسم الشركة" value={form.company_name} onChange={(e) => F("company_name", e.target.value)} placeholder="مثال: شركة النجوم" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم صاحبها / المسؤول" value={form.owner_name} onChange={(e) => F("owner_name", e.target.value)} placeholder="مثال: خالد سمير" />
            <Field label="المستلم / من سيأخذها" value={form.recipient_name} onChange={(e) => F("recipient_name", e.target.value)} placeholder="مثال: علي حسن" />
          </div>

          <Field label="التاريخ" type="date" value={form.record_date} onChange={(e) => F("record_date", e.target.value)} />

          <Field label="ملاحظة إضافية" value={form.note} onChange={(e) => F("note", e.target.value)} placeholder="أي تفاصيل إضافية..." />

          <PrimaryButton type="submit" disabled={saving} className="w-full">
            <Receipt className="h-4 w-4" />
            {saving ? "جارٍ الحفظ..." : "إضافة المعاملة"}
          </PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
