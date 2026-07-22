import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Boxes, Plus, Trash2, Briefcase, Wrench } from "lucide-react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, Modal, Field, PrimaryButton } from "@/components/Kit";

export default function Operations() {
  const { refreshCompany } = useAuth();
  const [equipment, setEquipment] = useState([]);
  const [projects, setProjects] = useState([]);
  const [crew, setCrew] = useState([]);
  const [eqOpen, setEqOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const [eq, setEq] = useState({ name: "", amount: "", assigned_to: "", note: "" });
  const [pr, setPr] = useState({ name: "", budget_spent: "", manager_spending: "", personal_expense: "", advance_payment: "", company_name: "", owner_name: "", recipient_name: "", work_date: new Date().toISOString().split("T")[0], equipment_used: [], assigned_crew: [], note: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/equipment").then((r) => setEquipment(r.data)).catch(() => {});
    api.get("/projects").then((r) => setProjects(r.data)).catch(() => {});
    api.get("/crew").then((r) => setCrew(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const addEq = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/equipment", { ...eq, amount: Number(eq.amount) || 0 });
      toast.success("تمت إضافة المعدة");
      setEqOpen(false); setEq({ name: "", amount: "", assigned_to: "", note: "" }); load(); refreshCompany();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  const addPr = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post("/projects", {
        ...pr, budget_spent: Number(pr.budget_spent) || 0, manager_spending: Number(pr.manager_spending) || 0,
        personal_expense: Number(pr.personal_expense) || 0, advance_payment: Number(pr.advance_payment) || 0,
      });
      toast.success("تمت إضافة المهمة");
      setPrOpen(false); setPr({ name: "", budget_spent: "", manager_spending: "", personal_expense: "", advance_payment: "", company_name: "", owner_name: "", recipient_name: "", work_date: new Date().toISOString().split("T")[0], equipment_used: [], assigned_crew: [], note: "" }); load(); refreshCompany();
    } catch (e) { toast.error(apiErr(e.response?.data?.detail)); } finally { setSaving(false); }
  };

  const toggleArr = (key, val) => {
    setPr((p) => ({ ...p, [key]: p[key].includes(val) ? p[key].filter((x) => x !== val) : [...p[key], val] }));
  };

  return (
    <div>
      <PageHeader title="إدارة المهام والمعدات" subtitle="نظّم العمل: من يذهب لأي مهمة، أي معدة استُخدمت، وكم صُرف" icon={Boxes} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Projects */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold"><Briefcase className="h-5 w-5 text-violet-400" /> المهام / الأعمال</h3>
            <PrimaryButton onClick={() => setPrOpen(true)} data-testid="add-project-btn"><Plus className="h-4 w-4" /> مهمة</PrimaryButton>
          </div>
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border p-4" data-testid={`project-${p.id}`}>
                <div className="flex items-center justify-between">
                  <p className="font-bold">{p.name}</p>
                  <button onClick={async () => { await api.delete(`/projects/${p.id}`); load(); }} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="font-mono-x">صُرف: {p.budget_spent?.toLocaleString()} $</span>
                  <span className="font-mono-x">صرف المدير: {p.manager_spending?.toLocaleString()} $</span>
                </div>
                {p.assigned_crew?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.assigned_crew.map((id) => {
                      const m = crew.find((c) => c.id === id);
                      return <span key={id} className="rounded-full bg-muted px-2 py-0.5 text-xs">{m?.name || "عضو"}</span>;
                    })}
                  </div>
                )}
                {p.equipment_used?.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {p.equipment_used.map((id) => {
                      const m = equipment.find((c) => c.id === id);
                      return <span key={id} className="flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-400"><Wrench className="h-3 w-3" /> {m?.name || "معدة"}</span>;
                    })}
                  </div>
                )}
              </div>
            ))}
            {projects.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد مهام بعد.</p>}
          </div>
        </GlassCard>

        {/* Equipment */}
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold"><Wrench className="h-5 w-5 text-cyan-400" /> المعدات والأصول</h3>
            <PrimaryButton onClick={() => setEqOpen(true)} data-testid="add-equipment-btn"><Plus className="h-4 w-4" /> معدة</PrimaryButton>
          </div>
          <div className="space-y-3">
            {equipment.map((it) => {
              const owner = crew.find((c) => c.id === it.assigned_to);
              return (
                <div key={it.id} className="flex items-center justify-between rounded-2xl border border-border p-4" data-testid={`equipment-${it.id}`}>
                  <div>
                    <p className="font-bold">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{owner ? `بحوزة: ${owner.name}` : "غير مخصصة"} {it.note ? `· ${it.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-x text-sm gradient-text">{it.amount?.toLocaleString()} $</span>
                    <button onClick={async () => { await api.delete(`/equipment/${it.id}`); load(); }} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
            {equipment.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">لا توجد معدات بعد.</p>}
          </div>
        </GlassCard>
      </div>

      {/* Equipment modal */}
      <Modal open={eqOpen} onClose={() => setEqOpen(false)} title="إضافة معدة" testId="equipment-modal">
        <form onSubmit={addEq} className="space-y-4">
          <Field label="اسم المعدة" value={eq.name} onChange={(e) => setEq({ ...eq, name: e.target.value })} required data-testid="eq-name" />
          <Field label="التكلفة ($)" type="number" value={eq.amount} onChange={(e) => setEq({ ...eq, amount: e.target.value })} data-testid="eq-amount" />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-muted-foreground">تخصيص لعضو</span>
            <select value={eq.assigned_to} onChange={(e) => setEq({ ...eq, assigned_to: e.target.value })} className="w-full rounded-xl border border-input bg-background/60 px-3 py-2.5 text-sm">
              <option value="">— بدون —</option>
              {crew.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <Field label="ملاحظة" value={eq.note} onChange={(e) => setEq({ ...eq, note: e.target.value })} />
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="eq-submit">{saving ? "جارٍ..." : "إضافة"}</PrimaryButton>
        </form>
      </Modal>

      {/* Project modal */}
      <Modal open={prOpen} onClose={() => setPrOpen(false)} title="إضافة مهمة / عمل" testId="project-modal">
        <form onSubmit={addPr} className="space-y-4">
          <Field label="اسم المهمة / العمل *" value={pr.name} onChange={(e) => setPr({ ...pr, name: e.target.value })} required data-testid="pr-name" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="المبلغ المصروف (ج.م)" type="number" value={pr.budget_spent} onChange={(e) => setPr({ ...pr, budget_spent: e.target.value })} data-testid="pr-budget" />
            <Field label="صرف المدير (ج.م)" type="number" value={pr.manager_spending} onChange={(e) => setPr({ ...pr, manager_spending: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المصروف الشخصي (ج.م)" type="number" value={pr.personal_expense} onChange={(e) => setPr({ ...pr, personal_expense: e.target.value })} placeholder="0" />
            <Field label="العربون / دفعة مقدمة (ج.م)" type="number" value={pr.advance_payment} onChange={(e) => setPr({ ...pr, advance_payment: e.target.value })} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الشركة" value={pr.company_name} onChange={(e) => setPr({ ...pr, company_name: e.target.value })} placeholder="اسم شركة العميل" />
            <Field label="اسم صاحب الشركة" value={pr.owner_name} onChange={(e) => setPr({ ...pr, owner_name: e.target.value })} placeholder="اسم صاحب الشركة" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="المستلم / من سيأخذ" value={pr.recipient_name} onChange={(e) => setPr({ ...pr, recipient_name: e.target.value })} placeholder="من سيأخذ المبلغ" />
            <Field label="تاريخ العمل" type="date" value={pr.work_date} onChange={(e) => setPr({ ...pr, work_date: e.target.value })} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">الموظفون المُكلّفون</p>
            <div className="flex flex-wrap gap-2">
              {crew.map((c) => (
                <button type="button" key={c.id} onClick={() => toggleArr("assigned_crew", c.id)}
                  className={`rounded-full px-3 py-1 text-xs ${pr.assigned_crew.includes(c.id) ? "gradient-primary text-white" : "border border-border"}`}>{c.name}</button>
              ))}
              {crew.length === 0 && <span className="text-xs text-muted-foreground">أضف موظفين أولاً</span>}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">المعدات المستخدمة</p>
            <div className="flex flex-wrap gap-2">
              {equipment.map((c) => (
                <button type="button" key={c.id} onClick={() => toggleArr("equipment_used", c.id)}
                  className={`rounded-full px-3 py-1 text-xs ${pr.equipment_used.includes(c.id) ? "gradient-primary text-white" : "border border-border"}`}>{c.name}</button>
              ))}
              {equipment.length === 0 && <span className="text-xs text-muted-foreground">أضف معدات أولاً</span>}
            </div>
          </div>
          <Field label="ملاحظة" value={pr.note} onChange={(e) => setPr({ ...pr, note: e.target.value })} />
          <PrimaryButton type="submit" disabled={saving} className="w-full" data-testid="pr-submit">{saving ? "جارٍ..." : "إضافة المهمة"}</PrimaryButton>
        </form>
      </Modal>
    </div>
  );
}
