import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, Wifi, WifiOff, Clock, CheckCircle2, XCircle, AlertTriangle,
  RefreshCw, Users, TrendingUp, Calendar, Smartphone, MapPin, Globe,
} from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard, StatCard } from "@/components/Kit";
import { formatTime12h } from "@/lib/utils";

const statusColor = {
  online: "text-emerald-400",
  idle: "text-amber-400",
  offline: "text-slate-400",
};
const statusBg = {
  online: "border-emerald-400/30 bg-emerald-400/5",
  idle: "border-amber-400/30 bg-amber-400/5",
  offline: "border-slate-400/20 bg-slate-400/5",
};
const statusLabel = {
  online: "متصل",
  idle: "خامل",
  offline: "غير متصل",
};
const attLabel = {
  present: { label: "حاضر في الموعد", color: "text-emerald-400", icon: CheckCircle2 },
  late: { label: "حاضر متأخر", color: "text-amber-400", icon: AlertTriangle },
  absent: { label: "لم يحضر اليوم", color: "text-red-400", icon: XCircle },
  absence: { label: "غائب (خصم)", color: "text-red-500", icon: XCircle },
};

export default function LiveMonitor() {
  const [crew, setCrew] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/monitor/live");
      setCrew(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = crew.filter((c) => {
    if (filter === "present") return c.checked_in_today;
    if (filter === "absent") return !c.checked_in_today;
    if (filter === "online") return c.online_status === "online";
    return true;
  });

  const presentCount = crew.filter((c) => c.checked_in_today).length;
  const absentCount = crew.length - presentCount;
  const onlineCount = crew.filter((c) => c.online_status === "online").length;
  const avgRate = crew.length
    ? Math.round(crew.reduce((s, c) => s + c.commitment_rate, 0) / crew.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="مراقبة الموظفين لحظة بلحظة"
        subtitle="تابع حضور وتواجد جميع الموظفين في الوقت الفعلي"
        icon={Activity}
      >
        <button
          onClick={load}
          className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover"
        >
          <RefreshCw className="h-4 w-4" /> تحديث
        </button>
      </PageHeader>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="الحاضرون اليوم" value={presentCount} icon={CheckCircle2} accent="from-emerald-500 to-teal-500" />
        <StatCard label="الغائبون" value={absentCount} icon={XCircle} accent="from-red-500 to-rose-500" />
        <StatCard label="متصل الآن" value={onlineCount} icon={Wifi} accent="from-cyan-500 to-blue-500" />
        <StatCard label="متوسط الالتزام" value={`${avgRate}%`} icon={TrendingUp} accent="from-violet-500 to-fuchsia-500" />
      </div>

      {/* Last refresh */}
      {lastRefresh && (
        <p className="text-xs text-muted-foreground text-center">
          آخر تحديث: {lastRefresh.toLocaleTimeString("ar-EG")} — يتحدث تلقائياً كل 15 ثانية
        </p>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: "all", label: `الكل (${crew.length})` },
          { key: "present", label: `الحاضرون (${presentCount})` },
          { key: "absent", label: `الغائبون (${absentCount})` },
          { key: "online", label: `متصل الآن (${onlineCount})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              filter === f.key
                ? "gradient-primary text-white void-glow"
                : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Employee cards */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">لا يوجد موظفون في هذه الفئة</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp, i) => {
            const attInfo = attLabel[emp.attendance_type] || attLabel["absent"];
            const AttIcon = attInfo.icon;
            const onlineSt = emp.online_status || "offline";
            return (
              <motion.div
                key={emp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard className={`${statusBg[onlineSt]} border transition-all`}>
                  {/* Header */}
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-primary text-white font-bold text-lg overflow-hidden">
                          {emp.avatar_url ? (
                            <img src={emp.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span>{emp.name?.[0] || "؟"}</span>
                          )}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card ${
                            onlineSt === "online" ? "bg-emerald-400" : onlineSt === "idle" ? "bg-amber-400" : "bg-slate-400"
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-bold leading-tight">{emp.name}</p>
                        <p className="text-xs text-muted-foreground">{emp.job_title || "موظف"}</p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-bold ${statusColor[onlineSt]}`}>
                      {onlineSt === "online" ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                      {statusLabel[onlineSt]}
                    </div>
                  </div>

                  {/* Attendance status */}
                  <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold ${attInfo.color} ${
                    emp.checked_in_today ? "border-current/20 bg-current/5" : "border-red-400/20 bg-red-400/5"
                  }`}>
                    <AttIcon className="h-4 w-4" />
                    <span>{attInfo.label}</span>
                    {emp.check_time && (
                      <span className="ms-auto flex items-center gap-1 text-xs opacity-80">
                        <Clock className="h-3 w-3" /> {formatTime12h(emp.check_time)}
                      </span>
                    )}
                  </div>

                  {/* Check-in details */}
                  {emp.checked_in_today && (
                    <div className="mb-3 space-y-1.5 text-xs text-muted-foreground">
                      {emp.check_device && (
                        <div className="flex items-center gap-1.5">
                          <Smartphone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{emp.check_device}</span>
                        </div>
                      )}
                      {emp.check_ip && (
                        <div className="flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          <span>{emp.check_ip}</span>
                        </div>
                      )}
                      {emp.check_location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{emp.check_location}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-base font-black text-emerald-400">{emp.present_days}</p>
                      <p className="text-[10px] text-muted-foreground">حاضر</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-base font-black text-red-400">{emp.absent_days}</p>
                      <p className="text-[10px] text-muted-foreground">غائب</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-base font-black gradient-text">{emp.commitment_rate}%</p>
                      <p className="text-[10px] text-muted-foreground">التزام</p>
                    </div>
                  </div>

                  {/* Inactivity warning */}
                  {emp.inactivity_minutes > 60 && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-400/10 px-3 py-1.5 text-xs text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      خامل منذ {emp.inactivity_minutes} دقيقة
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
