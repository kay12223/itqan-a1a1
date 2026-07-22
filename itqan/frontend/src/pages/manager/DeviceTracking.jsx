import { useEffect, useState } from "react";
import {
  ShieldAlert, Smartphone, MapPin, Globe, CheckCircle2,
  LogOut, AlertTriangle, Wifi, UserCheck, UserX, Clock,
} from "lucide-react";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";
import { useAuth } from "@/context/AuthContext";
import FeatureLock from "@/components/FeatureLock";

const FLAG_STYLE = {
  shared_device:  "border-red-500 bg-red-500/10 text-red-400",
  unusual_device: "border-amber-400 bg-amber-400/10 text-amber-400",
  unusual_ip:     "border-amber-400 bg-amber-400/10 text-amber-400",
  network_change: "border-violet-400 bg-violet-400/10 text-violet-400",
};

export default function DeviceTracking() {
  const { company } = useAuth();
  const hasFeature = !!company?.addons?.device_tracking?.unlocked;

  const [entries, setEntries]           = useState([]);
  const [suspiciousOpen, setSuspiciousOpen] = useState(0);
  const [total, setTotal]               = useState(0);
  const [filter, setFilter]             = useState("all"); // all | suspicious
  const [loading, setLoading]           = useState(true);

  // pending device-change approvals
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/device-tracking", { params: { suspicious_only: filter === "suspicious", limit: 100 } })
      .then(r => {
        setEntries(r.data.entries || []);
        setTotal(r.data.total || 0);
        setSuspiciousOpen(r.data.suspicious_open || 0);
      })
      .catch(err => toast.error(apiErr(err.response?.data?.detail) || "تعذر تحميل سجلات الأجهزة"))
      .finally(() => setLoading(false));
  };

  const loadApprovals = () => {
    setApprovalsLoading(true);
    api.get("/pending-approvals")
      .then(r => setPendingApprovals((r.data || []).filter(a => a.action_type === "device_change")))
      .catch(() => {})
      .finally(() => setApprovalsLoading(false));
  };

  useEffect(() => { load(); }, [filter]);
  useEffect(() => { loadApprovals(); }, []);

  const resolve = async (id) => {
    try { await api.post(`/device-tracking/${id}/resolve`); toast.success("تم وضع علامة محلول"); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const forceLogout = async (employeeId, name) => {
    try {
      await api.post(`/device-tracking/${employeeId}/force-logout`);
      toast.success(`تم إلغاء ربط الجهاز — سيُطلب من ${name} التحقق من جديد`);
      load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const approveDeviceChange = async (aid, targetId, targetName) => {
    try {
      await api.post(`/pending-approvals/${aid}/approve`);
      toast.success(`✅ تمت الموافقة — جهاز ${targetName} الجديد مقبول`);
      loadApprovals(); load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const rejectDeviceChange = async (aid, targetId, targetName) => {
    try {
      await api.post(`/pending-approvals/${aid}/reject`);
      // Also force-logout so employee must re-verify
      await api.post(`/device-tracking/${targetId}/force-logout`).catch(() => {});
      toast.success(`❌ تم الرفض — جهاز ${targetName} لم يُقبل وتم إعادة ضبطه`);
      loadApprovals(); load();
    } catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  if (!hasFeature) {
    return (
      <FeatureLock
        pageTitle="تتبع الأجهزة والـIP"
        pageSubtitle="مراقبة أجهزة الحضور واكتشاف النشاط المشبوه"
        icon={ShieldAlert}
        title="تتبع الأجهزة للمشتركين فقط"
        description="ميزة مراقبة أجهزة الحضور واكتشاف النشاط المشبوه متاحة في خطة نصف السنة أو أعلى. قم بالترقية للوصول إليها."
        perks={["تتبع عناوين IP للموظفين", "كشف الأجهزة المشبوهة", "تنبيهات النشاط غير المعتاد"]}
      />
    );
  }

  return (
    <div>
      <PageHeader title="تتبع الأجهزة والـIP" subtitle="مراقبة أجهزة الحضور واكتشاف النشاط المشبوه" icon={ShieldAlert} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="إجمالي سجلات الحضور" value={total} icon={Smartphone} accent="from-cyan-500 to-blue-500" />
        <StatCard label="تنبيهات مفتوحة" value={suspiciousOpen} icon={AlertTriangle}
          accent={suspiciousOpen > 0 ? "from-red-500 to-rose-500" : "from-emerald-500 to-green-500"} />
        <StatCard label="موافقات جهاز معلقة" value={pendingApprovals.length} icon={ShieldAlert}
          accent={pendingApprovals.length > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-green-500"} />
      </div>

      {/* ── Pending device-change approvals ── */}
      {!approvalsLoading && pendingApprovals.length > 0 && (
        <GlassCard className="mb-6 border-amber-400/40">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="font-display font-bold">طلبات تأكيد تغيير الجهاز</h3>
              <p className="text-xs text-muted-foreground">
                {pendingApprovals.length} طلب يحتاج موافقتك — راجع الصورة وقرر
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {pendingApprovals.map(ap => (
              <div key={ap.id}
                className="flex flex-col gap-4 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 sm:flex-row sm:items-start">
                {/* Photo */}
                <div className="shrink-0">
                  {ap.photo ? (
                    <img src={ap.photo} alt="صورة عند تغيير الجهاز"
                      className="h-24 w-20 rounded-2xl border border-amber-400/30 object-cover" />
                  ) : (
                    <div className="flex h-24 w-20 items-center justify-center rounded-2xl border border-border bg-muted/20">
                      <Smartphone className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm mb-1">{ap.target_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                    {ap.old_device_info && (
                      <span className="flex items-center gap-1">
                        <Smartphone className="h-3 w-3 text-muted-foreground/50" />
                        الجهاز القديم: {ap.old_device_info}
                      </span>
                    )}
                    {ap.device_info && (
                      <span className="flex items-center gap-1">
                        <Smartphone className="h-3 w-3 text-amber-400" />
                        الجديد: {ap.device_info}
                      </span>
                    )}
                    {ap.network_name && (
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3 text-violet-400" />
                        الشبكة: {ap.network_name}
                      </span>
                    )}
                    {ap.ip_address && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> IP: {ap.ip_address}
                      </span>
                    )}
                    {ap.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-emerald-400" /> {ap.location}
                      </span>
                    )}
                    {ap.created_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(ap.created_at).toLocaleString("ar-EG")}
                      </span>
                    )}
                  </div>
                  {ap.note && (
                    <p className="text-xs text-amber-500 mb-2">⚠️ {ap.note}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2 sm:flex-col">
                  <button
                    onClick={() => approveDeviceChange(ap.id, ap.target_id, ap.target_name)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition">
                    <UserCheck className="h-4 w-4" /> قبول
                  </button>
                  <button
                    onClick={() => rejectDeviceChange(ap.id, ap.target_id, ap.target_name)}
                    className="flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/25 transition">
                    <UserX className="h-4 w-4" /> رفض وإعادة ضبط
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── History filters ── */}
      <div className="mb-4 flex gap-2">
        {[["all", "كل السجلات"], ["suspicious", "المشبوهة فقط"]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${filter === k ? "gradient-primary text-white" : "glass text-muted-foreground hover:text-foreground"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── History entries ── */}
      <GlassCard>
        <div className="space-y-3">
          {!loading && entries.length === 0 && (
            <p className="p-8 text-center text-muted-foreground">
              {filter === "suspicious" ? "لا توجد أنشطة مشبوهة حالياً ✨" : "لا توجد سجلات حضور بعد"}
            </p>
          )}
          {entries.map(e => (
            <div key={e._id} className={`rounded-xl border p-4
              ${e.is_suspicious && !e.is_resolved ? "border-s-4 border-amber-400/60 bg-amber-400/5" : "border-border"}
              ${e.is_resolved ? "opacity-50" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{e.employee_name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      e.scan_type === "checkout" ? "bg-rose-500/15 text-rose-400"
                      : e.scan_type === "login" ? "bg-violet-500/15 text-violet-400"
                      : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                      {e.scan_type === "checkout" ? "انصراف" : e.scan_type === "login" ? "تسجيل دخول" : "حضور"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" />{e.device_info}</span>
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{e.ip_address}</span>
                    {e.network_name && <span className="flex items-center gap-1"><Wifi className="h-3 w-3 text-violet-400" />{e.network_name}</span>}
                    {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                    <span>🕐 {e.created_at ? new Date(e.created_at).toLocaleString("ar-EG") : "—"}</span>
                  </div>
                  {e.suspicious_flags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {e.suspicious_flags.map((f, i) => (
                        <span key={i}
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${FLAG_STYLE[f.type] || FLAG_STYLE.unusual_device}`}
                          title={f.detail}>
                          {f.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {e.photo && (
                  <img src={e.photo} alt="صورة الموظف عند التسجيل"
                    className="h-16 w-16 shrink-0 rounded-xl border border-border object-cover" />
                )}
                {e.is_suspicious && !e.is_resolved && (
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => forceLogout(e.user_id, e.employee_name)}
                      title="إلغاء ربط الجهاز — تسجيل خروج قسري"
                      className="rounded-lg bg-red-500/15 p-1.5 text-red-400 hover:bg-red-500/25">
                      <LogOut className="h-4 w-4" />
                    </button>
                    <button onClick={() => resolve(e._id)} title="وضع علامة محلول"
                      className="rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 hover:bg-emerald-500/25">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
