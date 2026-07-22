import { useEffect, useState } from "react";
import { Shield, CheckCircle2, AlertTriangle, Monitor, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";

const SEV = {
  critical: { label: "حرج",   cls: "border-red-500 bg-red-500/10 text-red-400" },
  warning:  { label: "تحذير", cls: "border-amber-400 bg-amber-400/10 text-amber-400" },
  info:     { label: "معلومة",cls: "border-blue-400 bg-blue-400/10 text-blue-400" },
};

export default function SecurityCenter() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [devices, setDevices] = useState([]);
  const [tab, setTab] = useState("events");

  const load = () => {
    api.get("/security/events").then(r => setEvents(r.data)).catch(() => {});
    api.get("/devices").then(r => setDevices(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    try { await api.post(`/security/events/${id}/resolve`); toast.success("تم وضع علامة محلول"); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const removeDevice = async (id) => {
    try { await api.delete(`/devices/${id}`); toast.success("تم إزالة الجهاز"); load(); }
    catch (err) { toast.error(apiErr(err.response?.data?.detail)); }
  };

  const unresolved = events.filter(e => !e.is_resolved).length;
  const critical   = events.filter(e => e.severity === "critical" && !e.is_resolved).length;

  return (
    <div>
      <PageHeader title="مركز الأمان" subtitle="مراقبة الأجهزة والأحداث الأمنية" icon={Shield} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="أحداث غير محلولة" value={unresolved} icon={AlertTriangle}
          accent={unresolved > 0 ? "from-amber-500 to-orange-500" : "from-emerald-500 to-green-500"} />
        <StatCard label="أحداث حرجة" value={critical} icon={Shield}
          accent={critical > 0 ? "from-red-500 to-rose-500" : "from-emerald-500 to-green-500"} />
        <StatCard label="أجهزة مسجلة" value={devices.length} icon={Monitor}
          accent="from-cyan-500 to-blue-500" />
      </div>

      <div className="mb-4 flex gap-2">
        {[["events", "الأحداث الأمنية", Shield], ["devices", "الأجهزة المسجلة", Monitor]].map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold transition ${tab === k ? "gradient-primary text-white" : "glass text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-3.5 w-3.5" />{l}
          </button>
        ))}
      </div>

      <GlassCard>
        {tab === "events" && (
          <div className="space-y-3">
            {events.length === 0 && <p className="p-8 text-center text-muted-foreground">لا توجد أحداث أمنية حالياً ✨</p>}
            {events.map(ev => {
              const s = SEV[ev.severity] || SEV.info;
              return (
                <div key={ev.id} className={`flex items-start justify-between rounded-xl border-s-4 p-4 ${s.cls} ${ev.is_resolved ? "opacity-40" : ""}`}>
                  <div>
                    <p className="font-medium text-sm">{ev.message}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {ev.user_name && <span className="me-3">👤 {ev.user_name}</span>}
                      {ev.ip && <span className="me-3">🌐 {ev.ip}</span>}
                      <span>🕐 {ev.created_at ? new Date(ev.created_at).toLocaleString("ar-EG") : "—"}</span>
                    </p>
                  </div>
                  {!ev.is_resolved && (
                    <button onClick={() => resolve(ev.id)}
                      className="ms-3 shrink-0 rounded-lg bg-emerald-500/15 p-1.5 text-emerald-400 hover:bg-emerald-500/25">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "devices" && (
          <div className="space-y-3">
            {devices.length === 0 && <p className="p-8 text-center text-muted-foreground">لا توجد أجهزة مسجلة. ستظهر أجهزة الموظفين هنا بعد تسجيل دخولهم.</p>}
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className="font-medium">{d.device_name || "جهاز غير مُسمَّى"}</p>
                    <p className="text-xs text-muted-foreground">
                      آخر ظهور: {d.last_seen ? new Date(d.last_seen).toLocaleString("ar-EG") : "—"}
                    </p>
                  </div>
                </div>
                <button onClick={() => removeDevice(d.id)}
                  className="rounded-lg p-1.5 text-red-400 hover:bg-muted">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
