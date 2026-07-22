import { useEffect, useState, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw, QrCode, Bell, Clock, CheckCircle2, AlertTriangle,
  Monitor, Smartphone, Maximize2, Users,
} from "lucide-react";
import api from "@/lib/apiClient";
import { PageHeader, GlassCard } from "@/components/Kit";

const BASE_URL = "https://tiny-brooms-act.loca.lt";

export default function QRDisplay() {
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [fullscreen, setFullscreen] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/attendance/qr-token");
      setTokenData(data);
      setSecondsLeft(60);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await api.get("/ai-monitor/alerts");
      const qrAlerts = data.filter((a) => a.message.startsWith("📱"));
      setAlerts(qrAlerts.slice(0, 10));
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchToken();
    fetchAlerts();
  }, [fetchToken, fetchAlerts]);

  useEffect(() => {
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  useEffect(() => {
    if (!tokenData) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { fetchToken(); return 60; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tokenData, fetchToken]);
const qrValue = tokenData ? `${BASE_URL}/self-checkin/${tokenData.empId}/${tokenData.token}` : "";
  const progressColor = secondsLeft > 15 ? "#22d3ee" : secondsLeft > 8 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-6">
      <PageHeader
        title="كود QR الحضور"
        subtitle="اعرض هذه الشاشة للموظفين ليمسحوا الكود بهواتفهم — للكمبيوتر فقط"
        icon={QrCode}
      >
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="flex items-center gap-2 rounded-xl glass px-4 py-2.5 text-sm font-bold card-hover"
        >
          <Maximize2 className="h-4 w-4" /> {fullscreen ? "خروج" : "ملء الشاشة"}
        </button>
      </PageHeader>

      {/* Desktop notice */}
      <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2.5 text-sm text-emerald-400">
        <Monitor className="h-4 w-4" />
        <span className="font-bold">أنت على الكمبيوتر — رمز QR نشط ومتاح للموظفين</span>
        <span className="ms-auto rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs">مؤمَّن</span>
      </div>

      <div className={`grid gap-6 ${fullscreen ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
        {/* QR Code Card */}
        <GlassCard className={`flex flex-col items-center text-center ${fullscreen ? "py-12" : ""}`}>
          <p className="mb-4 font-display text-xl font-bold">امسح بالكاميرا لتسجيل الحضور</p>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] gradient-primary opacity-20 blur-2xl" />
            <div className="relative rounded-3xl border-2 border-primary/40 bg-white p-6 shadow-2xl">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="loading"
                    className={`flex items-center justify-center ${fullscreen ? "h-80 w-80" : "h-56 w-56"}`}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={tokenData?.token}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                  >
                    <QRCodeSVG
                     value={qrValue.replace("localhost", "192.168.1.60")}
                      size={fullscreen ? 320 : 224}
                      level="H"
                      includeMargin={false}
                      fgColor="#111118"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Countdown */}
          <div className="mt-6 flex items-center gap-4">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="24" fill="none"
                  stroke={progressColor} strokeWidth="4"
                  strokeDasharray={`${(secondsLeft / 60) * 150.8} 150.8`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-black" style={{ color: progressColor }}>
                {secondsLeft}
              </span>
            </div>
            <div className="text-right">
              <p className="font-bold">يتجدد الكود تلقائياً</p>
              <p className="text-xs text-muted-foreground">أو بعد كل مسح ناجح</p>
            </div>
          </div>

          <button
            onClick={fetchToken}
            className="mt-4 flex items-center gap-2 rounded-2xl border border-primary/40 px-5 py-2 text-sm font-bold text-primary hover:bg-primary/10 transition"
          >
            <RefreshCw className="h-4 w-4" /> تجديد الكود الآن
          </button>
        </GlassCard>

        {/* Recent Check-ins */}
        {!fullscreen && (
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Bell className="h-5 w-5 text-cyan-400" /> تسجيلات QR اليوم
              </h3>
              <button onClick={fetchAlerts} className="rounded-xl border border-border p-2 hover:bg-muted/60 transition">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 space-y-3 overflow-y-auto">
              {alerts.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">لم يسجّل أحد بعد عبر QR اليوم</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">ستظهر التسجيلات هنا فور المسح</p>
                </div>
              ) : (
                alerts.map((a) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-start gap-3 rounded-2xl border p-3 ${
                      a.severity === "warning"
                        ? "border-amber-400/30 bg-amber-400/10"
                        : "border-emerald-400/30 bg-emerald-400/10"
                    }`}
                  >
                    {a.severity === "warning" ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{a.message}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        )}
      </div>

      {/* How to use */}
      <GlassCard>
        <h3 className="mb-4 font-display text-lg font-bold">كيفية الاستخدام</h3>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { n: "1", icon: Monitor, title: "اعرض هذه الشاشة", desc: "على كمبيوتر أو شاشة عند مدخل الشركة" },
            { n: "2", icon: Smartphone, title: "الموظف يفتح التطبيق", desc: "ويضغط على «فتح كاميرا المسح» من هاتفه" },
            { n: "3", icon: QrCode, title: "يمسح الكود", desc: "يوجّه الكاميرا للرمز ويضغط تأكيد" },
            { n: "4", icon: Bell, title: "تصلك إشعار فوري", desc: "مع اسمه والوقت والموقع والجهاز" },
          ].map((s) => (
            <div key={s.n} className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full gradient-primary text-sm font-black text-white">
                {s.n}
              </span>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon className="h-3.5 w-3.5 text-primary" />
                  <p className="font-bold text-sm">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
