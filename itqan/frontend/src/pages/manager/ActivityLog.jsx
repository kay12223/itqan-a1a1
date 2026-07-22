import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity, RefreshCw, Filter, Search, LogIn, QrCode, Wallet,
  Users, Settings, AlertTriangle, CheckCircle2, XCircle, Calendar,
  Download,
} from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard } from "@/components/Kit";

const ACTION_ICONS = {
  login: { icon: LogIn, color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
  qr_checkin: { icon: QrCode, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  bank: { icon: Wallet, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  crew: { icon: Users, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20" },
  settings: { icon: Settings, color: "text-cyan-400", bg: "bg-cyan-400/10 border-cyan-400/20" },
  alert: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  error: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  default: { icon: Activity, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

function getActionConfig(action) {
  return ACTION_ICONS[action] || ACTION_ICONS.default;
}

function formatDateTime(dtStr) {
  if (!dtStr) return "—";
  try {
    const d = new Date(dtStr);
    return d.toLocaleString("ar-EG", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dtStr;
  }
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/activity-log");
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter((l) => {
    const matchSearch = !search || l.message?.toLowerCase().includes(search.toLowerCase()) || l.user_name?.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || l.action === filterAction;
    return matchSearch && matchAction;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const uniqueActions = [...new Set(logs.map((l) => l.action))].filter(Boolean);

  const exportCsv = () => {
    const rows = [
      ["الوقت", "المستخدم", "الإجراء", "التفاصيل", "IP"],
      ...filtered.map((l) => [
        formatDateTime(l.created_at),
        l.user_name || "—",
        l.action || "—",
        l.message || "—",
        l.ip || "—",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="سجل النشاط"
        subtitle="سجل كامل بجميع العمليات والأحداث في النظام"
        icon={Activity}
      >
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
          <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover">
            <Download className="h-4 w-4" /> تصدير CSV
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "إجمالي السجلات", value: logs.length, color: "text-primary" },
          { label: "عمليات تسجيل دخول", value: logs.filter((l) => l.action === "login").length, color: "text-blue-400" },
          { label: "حضور QR", value: logs.filter((l) => l.action === "qr_checkin").length, color: "text-emerald-400" },
          { label: "معاملات مالية", value: logs.filter((l) => l.action === "bank").length, color: "text-amber-400" },
        ].map((s) => (
          <GlassCard key={s.label} className="text-center p-4">
            <p className={`font-display text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="بحث في السجل..."
              className="w-full rounded-xl border border-border bg-transparent py-2.5 ps-10 pe-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterAction}
              onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
              className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none"
            >
              <option value="all">كل الإجراءات</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Log list */}
      <GlassCard>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">لا توجد سجلات تطابق البحث</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginated.map((log, i) => {
              const cfg = getActionConfig(log.action);
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={log.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-start gap-3 rounded-xl border p-3 ${cfg.bg}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/60 ${cfg.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold">{log.message || log.action}</p>
                        {log.user_name && (
                          <p className="text-xs text-muted-foreground">بواسطة: {log.user_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {log.ip && <span className="rounded bg-muted px-1.5 py-0.5">{log.ip}</span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>
                    </div>
                    {log.details && (
                      <p className="mt-1 text-xs text-muted-foreground/70">{log.details}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-40 hover:bg-muted transition"
            >السابق</button>
            <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-xl border border-border px-3 py-2 text-sm disabled:opacity-40 hover:bg-muted transition"
            >التالي</button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
