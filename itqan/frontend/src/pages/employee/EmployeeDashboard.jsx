import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2, Wallet, TrendingDown, TrendingUp, CalendarCheck,
  Clock, XCircle, Camera, QrCode, Smartphone, Monitor, MapPin,
  User, AlertTriangle, RefreshCw,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import api, { apiErr } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, StatCard, PrimaryButton } from "@/components/Kit";
import { formatTime12h } from "@/lib/utils";

function useIsMobile() {
  const ua = navigator.userAgent || "";
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;
  return isMobileUA || isSmallScreen;
}

function DesktopQRCheckin({ user, data }) {
  const checked = data?.checked_in_today;

  if (checked) {
    return (
      <GlassCard className="text-center border-emerald-400/40">
        <CheckCircle2 className="mx-auto mb-3 h-16 w-16 text-emerald-400" />
        <p className="font-display text-2xl font-black text-emerald-400">تم تسجيل حضورك ✅</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {data?.status === "late" ? "⚠️ سجّلت متأخراً اليوم" : "في الموعد — عمل رائع!"}
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="border-primary/30">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Steps visual */}
        <div className="flex shrink-0 flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-white void-glow">
              <QrCode className="h-8 w-8" />
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Camera className="h-8 w-8" />
            </div>
          </div>
          <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-bold text-amber-400">
            إلزاميان معاً
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col items-center gap-4 text-center sm:items-start sm:text-right">
          <div>
            <p className="font-display text-xl font-black">{user?.name}</p>
            <p className="text-sm text-muted-foreground">لتسجيل الحضور استخدم هاتفك</p>
          </div>

          <div className="w-full space-y-2">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl gradient-primary text-white text-xs font-black">1</span>
              <div className="text-right">
                <p className="font-bold">امسح رمز QR بهاتفك</p>
                <p className="text-xs text-muted-foreground">الكود موجود على شاشة المدير عند المدخل</p>
              </div>
              <QrCode className="ms-auto h-5 w-5 text-primary shrink-0" />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-400 text-xs font-black">2</span>
              <div className="text-right">
                <p className="font-bold">صورة الوجه تلقائية</p>
                <p className="text-xs text-muted-foreground">تُلتقط بالكاميرا الأمامية خلال 3 ثوانٍ</p>
              </div>
              <Camera className="ms-auto h-5 w-5 text-emerald-400 shrink-0" />
            </div>
          </div>

          <div className="w-full rounded-2xl border border-red-400/20 bg-red-400/5 px-4 py-2.5 text-xs text-red-400 text-center">
            🚫 لا يمكن تسجيل الحضور من الكمبيوتر — استخدم هاتفك لمسح QR
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function EmployeeQRCode({ checked }) {
  const [qrData, setQrData] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(30);

  const fetchQr = useCallback(async () => {
    try {
      const { data } = await api.get("/me/employee-qr");
      setQrData(data);
      setSecondsLeft(data.expires_in || 30);
    } catch {}
  }, []);

  useEffect(() => { fetchQr(); }, [fetchQr]);

  useEffect(() => {
    if (!qrData) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { fetchQr(); return 30; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [qrData, fetchQr]);

  const qrValue = qrData
    ? `EMPLOYEE:${qrData.employee_id}:${qrData.employee_name}:${qrData.token}`
    : "";

  const progressColor = secondsLeft > 15 ? "#22d3ee" : secondsLeft > 8 ? "#f59e0b" : "#ef4444";

  if (checked) {
    return (
      <GlassCard className="text-center border-emerald-400/40">
        <CheckCircle2 className="mx-auto mb-3 h-16 w-16 text-emerald-400" />
        <p className="font-display text-2xl font-black text-emerald-400">تم تسجيل حضورك ✅</p>
        <p className="mt-2 text-sm text-muted-foreground">في الموعد — عمل رائع!</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col items-center text-center border-primary/30 gap-4">
      <p className="font-display text-xl font-bold">كود QR الحضور الخاص بك</p>
      <p className="text-sm text-muted-foreground -mt-2">اعرض هذا الكود للمدير لتسجيل حضورك</p>

      {/* QR */}
      <div className="relative">
        <div className="absolute -inset-4 rounded-[2rem] gradient-primary opacity-20 blur-2xl" />
        <div className="relative rounded-3xl border-2 border-primary/40 bg-white p-5 shadow-2xl">
          {qrValue ? (
            <QRCodeSVG value={qrValue} size={200} level="M" />
          ) : (
            <div className="flex h-[200px] w-[200px] items-center justify-center">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-2 rounded-2xl border border-border px-5 py-2.5">
        <Clock className="h-4 w-4" style={{ color: progressColor }} />
        <span className="font-mono text-sm font-bold" style={{ color: progressColor }}>
          يتجدد خلال {secondsLeft}ث
        </span>
      </div>

      <div className="w-full rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-400">
        <QrCode className="mx-auto mb-1 h-4 w-4" />
        الكود يتغير تلقائياً كل 30 ثانية لضمان الأمان
      </div>
    </GlassCard>
  );
}

function MobileQRCheckin({ data, onCheckinDone }) {
  const checked = data?.checked_in_today;
  return <EmployeeQRCode checked={checked} />;
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const isMobile = useIsMobile();

  const load = () => api.get("/me/dashboard").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const fmt = (v) => `${(v || 0).toLocaleString()} ج.م`;

  return (
    <div className="space-y-5">
      <PageHeader
        title={`أهلاً ${user?.name || ""} 👋`}
        subtitle={isMobile ? "سجّل حضورك بمسح QR في مكان العمل" : "سجّل حضورك وتابع راتبك وأدائك"}
        icon={CheckCircle2}
      />

      {/* Checkin Card — smart by device */}
      {isMobile ? (
        <MobileQRCheckin data={data} onCheckinDone={load} />
      ) : (
        <DesktopQRCheckin user={user} data={data} onCheckinDone={load} />
      )}
{/* زرار الانصراف */}
      <GlassCard className="flex items-center justify-between border-cyan-500/30">
        <div>
          <p className="font-display text-lg font-bold">تسجيل الانصراف</p>
          <p className="text-xs text-muted-foreground">اضغط هنا عند مغادرة مقر العمل لتسجيل الانصراف</p>
        </div>
        <PrimaryButton onClick={() => window.location.href = "/attend-checkout"}>
          تسجيل الانصراف
        </PrimaryButton>
      </GlassCard>
      {/* Stats */}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="الراتب الشهري" value={fmt(data?.monthly_salary)} icon={Wallet} testId="emp-salary" />
            <StatCard label="إجمالي الخصومات" value={fmt(data?.total_deductions)} icon={TrendingDown} accent="from-red-500 to-rose-500" testId="emp-deductions" />
            <StatCard label="إجمالي الإضافات" value={fmt(data?.total_additions)} icon={TrendingUp} accent="from-emerald-500 to-green-500" testId="emp-additions" />
            <StatCard label="صافي الراتب" value={fmt(data?.net_salary)} icon={Wallet} accent="from-cyan-500 to-blue-500" testId="emp-net" />
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <div className="grid grid-cols-3 gap-4 lg:col-span-1 lg:grid-cols-1">
              <GlassCard className="text-center">
                <p className="font-display text-3xl font-black text-emerald-400">{data?.present_days ?? 0}</p>
                <p className="text-xs text-muted-foreground">أيام حضور</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="font-display text-3xl font-black text-amber-400">{data?.late_days ?? 0}</p>
                <p className="text-xs text-muted-foreground">أيام تأخير</p>
              </GlassCard>
              <GlassCard className="text-center">
                <p className="font-display text-3xl font-black text-red-400">{data?.absent_days ?? 0}</p>
                <p className="text-xs text-muted-foreground">أيام غياب</p>
              </GlassCard>
            </div>

            <GlassCard className="lg:col-span-2">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
                <CalendarCheck className="h-5 w-5 text-cyan-400" /> آخر سجلات الحضور
              </h3>
              <div className="space-y-2">
                {data?.recent_logs?.map((l, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <span className="font-mono text-muted-foreground">{l.log_date}</span>
                    <span className="flex items-center gap-2">
                      {l.type === "present" && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-4 w-4" /> حاضر</span>}
                      {l.type === "late" && <span className="flex items-center gap-1 text-amber-400"><Clock className="h-4 w-4" /> متأخر</span>}
                      {l.type === "absence" && <span className="flex items-center gap-1 text-red-400"><XCircle className="h-4 w-4" /> غائب</span>}
                      {l.check_time && <span className="font-mono text-xs text-muted-foreground">{formatTime12h(l.check_time)}</span>}
                      {l.deduction_amount > 0 && <span className="font-mono text-xs text-red-400">-{l.deduction_amount}</span>}
                    </span>
                  </div>
                ))}
                {(!data?.recent_logs || data.recent_logs.length === 0) && (
                  <p className="p-4 text-center text-sm text-muted-foreground">لا توجد سجلات بعد.</p>
                )}
              </div>
            </GlassCard>
          </div>
        </>
      )}

      {!data && (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground/40" />
        </div>
      )}
    </div>
  );
}
