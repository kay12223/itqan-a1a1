/**
 * Employee QR Scan page — /app/qr-scan
 *
 * Desktop: shows the employee's personal rotating QR code (URL-based, 60s).
 *          The employee shows the QR on screen → colleague/phone scans it.
 *          QR code is ONLY displayed on desktop — mobile users get the camera instead.
 *
 * Mobile:  shows front camera directly → liveness check → registers attendance via /me/checkin.
 *          Employees CANNOT see the QR display on mobile (prevents self-scan fraud).
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode, CheckCircle2, XCircle, Camera, Clock,
  Monitor, Smartphone, RefreshCw, MapPin, Globe, ShieldAlert,
} from "lucide-react";
import api from "@/lib/apiClient";
import { getDeviceId, getDeviceInfo, getNetworkInfo, isMobileDevice } from "@/lib/deviceInfo";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, GlassCard, PrimaryButton } from "@/components/Kit";
import { formatTime12h } from "@/lib/utils";

const BASE_URL = window.location.origin;
const SAMPLE_W = 80;
const SAMPLE_H = 60;
const LIVENESS_THRESHOLD = 6;
const QR_SECONDS = 60; // must match backend (60-second token window)

/* ════════════════════════════════
   DESKTOP: show QR code (60s)
════════════════════════════════ */
function DesktopQR({ user }) {
  const [qrData, setQrData]           = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_SECONDS);
  const mode = (user?.status === "present" || user?.status === "late") ? "checkout" : "checkin";

  const fetchQr = useCallback(async () => {
    try {
      const { data } = await api.get("/me/employee-qr");
      setQrData(data);
      setSecondsLeft(QR_SECONDS);
    } catch {}
  }, []);

  useEffect(() => { fetchQr(); }, [fetchQr]);

  useEffect(() => {
    if (!qrData) return;
    const iv = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { fetchQr(); return QR_SECONDS; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [qrData, fetchQr]);

  const timerColor =
    secondsLeft > 36 ? "#22d3ee" : secondsLeft > 18 ? "#f59e0b" : "#ef4444";
  const qrUrl = qrData
    ? `${BASE_URL}/self-checkin/${qrData.employee_id}/${qrData.token}`
    : "";

  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === "checkout" ? "كيو آر الانصراف" : "كيو آر الحضور"}
        subtitle={mode === "checkout"
          ? "اعرض الكود على شاشتك وامسحه بهاتفك لتسجيل انصرافك"
          : "اعرض الكود على شاشتك وامسحه بهاتفك لتسجيل حضورك"}
        icon={QrCode}
      />

      {/* Desktop-only notice */}
      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm
        ${mode === "checkout"
          ? "border-rose-400/30 bg-rose-400/10 text-rose-400"
          : "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"}`}>
        <Monitor className="h-4 w-4 shrink-0" />
        <span className="font-bold">
          {mode === "checkout"
            ? "أنت على الكمبيوتر — امسح الكود بهاتفك لتسجيل انصرافك"
            : "أنت على الكمبيوتر — امسح الكود بهاتفك لتسجيل حضورك"}
        </span>
      </div>

      {/* Security note */}
      <div className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs text-amber-500">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>هذا الكود يُجدَّد كل دقيقة — لا تشاركه مع أحد. يمكن استخدامه من هاتفك فقط.</span>
      </div>

      <GlassCard className="flex flex-col items-center text-center gap-5">
        <p className="font-display text-xl font-bold">كيو آر الخاص بك</p>
        <p className="text-sm text-muted-foreground -mt-3">كل موظف له كود مختلف — هذا كودك الشخصي</p>

        {/* QR */}
        <div className="relative">
          <div className="absolute -inset-4 rounded-[2rem] gradient-primary opacity-20 blur-2xl" />
          <div className="relative rounded-3xl border-2 border-primary/40 bg-white p-6 shadow-2xl">
            <AnimatePresence mode="wait">
              {qrUrl ? (
                <motion.div
                  key={qrUrl}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <QRCodeSVG value={qrUrl} size={230} level="H" fgColor="#111118" />
                </motion.div>
              ) : (
                <motion.div
                  key="loading"
                  className="flex h-[230px] w-[230px] items-center justify-center"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                >
                  <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 60s Timer */}
        <div className="flex items-center gap-3 rounded-2xl border border-border px-5 py-2.5">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={timerColor} strokeWidth="3.5"
                strokeDasharray={`${(secondsLeft / QR_SECONDS) * 125.6} 125.6`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s linear, stroke 0.5s" }}
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center font-mono text-xs font-black"
              style={{ color: timerColor }}
            >
              {secondsLeft}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">يتجدد الكود تلقائياً</p>
            <p className="text-xs text-muted-foreground">كل دقيقة كاملة</p>
          </div>
          <button onClick={fetchQr} className="ms-2 text-muted-foreground hover:text-foreground transition">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </GlassCard>

      {/* Steps */}
      <GlassCard>
        <h3 className="mb-4 font-display text-lg font-bold">كيف تستخدمه</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { n: "1", icon: Monitor,    title: "افتح هذه الشاشة على كمبيوترك", desc: "الكود يظهر فقط على الكمبيوتر للأمان" },
            { n: "2", icon: Smartphone, title: "امسح بكاميرا هاتفك", desc: "وجّه كاميرا هاتفك لمسح رمز QR الخاص بك" },
            { n: "3", icon: Camera,     title: "تحقق بوجهك وسجّل", desc: "ستطلب الصفحة كاميرا هاتفك للتحقق وتسجيل حضورك" },
          ].map((s) => (
            <div key={s.n} className="flex items-start gap-3 rounded-2xl border border-border p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-black text-white">{s.n}</span>
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

/* ════════════════════════════════
   MOBILE: direct face camera
════════════════════════════════ */
function MobileCamera({ user }) {
  const [step, setStep]         = useState("idle"); // idle|camera|submitting|done|error
  const [result, setResult]     = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [streamReady, setStreamReady] = useState(false);
  const [countdown, setCountdown]     = useState(3);
  const [livenessOk, setLivenessOk]  = useState(false);
  const [livenessMsg, setLivenessMsg] = useState("ابدأ بتحريك رأسك قليلاً...");
  const [locStr, setLocStr]     = useState("");

  const mode = (user?.status === "present" || user?.status === "late") ? "checkout" : "checkin";

  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const sampleRef   = useRef(null);
  const streamRef   = useRef(null);
  const cdRef       = useRef(null);
  const livRef      = useRef(null);
  const livTmRef    = useRef(null);
  const submitTmRef = useRef(null);
  const sessionRef  = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLocStr(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`),
      () => {}, { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const stopCamera = useCallback(() => {
    sessionRef.current += 1;
    if (cdRef.current)       { clearInterval(cdRef.current);       cdRef.current = null; }
    if (livRef.current)      { clearInterval(livRef.current);      livRef.current = null; }
    if (livTmRef.current)    { clearTimeout(livTmRef.current);     livTmRef.current = null; }
    if (submitTmRef.current) { clearTimeout(submitTmRef.current);  submitTmRef.current = null; }
    if (streamRef.current)   { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setStreamReady(false);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && step === "camera") { stopCamera(); setStep("idle"); }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [step, stopCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, []);

  const submitCheckin = useCallback(async (photo) => {
    setStep("submitting");
    stopCamera();
    const netInfo = getNetworkInfo();
    try {
      const payload = {
        device_info: getDeviceInfo(),
        device_id: getDeviceId(),
        location: locStr,
        photo,
        network_name: netInfo.label,
        network_type: netInfo.type,
      };
      const { data } = await api.post(
        mode === "checkout" ? "/attendance/checkout" : "/me/checkin",
        payload
      );
      setResult({ ...data, mode });
      setStep("done");
    } catch (e) {
      const detail = e.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "حدث خطأ — تأكد من اتصالك بالإنترنت");
      setStep("error");
    }
  }, [locStr, stopCamera, mode]);

  const startLiveness = useCallback((video, sessionId) => {
    const sample = sampleRef.current;
    if (!sample) return;
    const ctx = sample.getContext("2d");
    const roiW = SAMPLE_W * 0.4, roiH = SAMPLE_H * 0.4;
    const roiX = (SAMPLE_W - roiW) / 2, roiY = (SAMPLE_H - roiH) / 2;
    let frames = [], diffs = [];

    livRef.current = setInterval(() => {
      if (sessionRef.current !== sessionId) return;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const frame = ctx.getImageData(roiX, roiY, roiW, roiH);
      frames.push(frame);
      if (frames.length > 1) {
        const prev = frames[frames.length - 2], curr = frames[frames.length - 1];
        let total = 0;
        for (let i = 0; i < curr.data.length; i += 4) {
          total += Math.abs(curr.data[i] - prev.data[i]);
          total += Math.abs(curr.data[i+1] - prev.data[i+1]);
          total += Math.abs(curr.data[i+2] - prev.data[i+2]);
        }
        const d = total / (curr.data.length / 4);
        diffs.push(d);
        if (diffs.length > 12) diffs = diffs.slice(-12);
        const sustained = diffs.slice(-4).filter((v) => v > LIVENESS_THRESHOLD).length >= 3;
        if (sustained) {
          clearInterval(livRef.current); livRef.current = null;
          clearTimeout(livTmRef.current); livTmRef.current = null;
          setLivenessOk(true);
          setLivenessMsg("✅ تم التحقق — جارٍ التسجيل...");
          submitTmRef.current = setTimeout(() => {
            if (sessionRef.current !== sessionId) return;
            submitCheckin(capturePhoto());
          }, 500);
        } else {
          setLivenessMsg("حرّك رأسك قليلاً نحو اليمين أو اليسار...");
        }
      }
    }, 150);

    livTmRef.current = setTimeout(() => {
      if (sessionRef.current !== sessionId) return;
      clearInterval(livRef.current); livRef.current = null;
      stopCamera();
      setErrorMsg("انتهت مهلة التحقق — تأكد من الإضاءة وحرّك رأسك أمام الكاميرا");
      setStep("error");
    }, 25000);
  }, [capturePhoto, submitCheckin, stopCamera]);

  const startCamera = useCallback(async () => {
    stopCamera();
    const sessionId = sessionRef.current;
    setStep("camera");
    setStreamReady(false);
    setCountdown(3);
    setLivenessOk(false);
    setLivenessMsg("ابدأ بتحريك رأسك قليلاً...");
    try {
      // Try front-facing camera first; fall back to any camera if unavailable
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      if (sessionRef.current !== sessionId) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.setAttribute("playsinline", "");
        video.setAttribute("muted", "");
        video.onloadedmetadata = () => {
          video.play().catch(() => {});
          setStreamReady(true);
          let c = 3;
          setCountdown(c);
          cdRef.current = setInterval(() => {
            if (sessionRef.current !== sessionId) { clearInterval(cdRef.current); cdRef.current = null; return; }
            c -= 1;
            if (c > 0) { setCountdown(c); }
            else { clearInterval(cdRef.current); cdRef.current = null; setCountdown(0); startLiveness(video, sessionId); }
          }, 1000);
        };
      }
    } catch (err) {
      const msg = err?.name || err?.message || "";
      let errText = "❌ تعذّر فتح الكاميرا — حاول مجدداً";
      if (msg === "NotAllowedError" || msg.includes("ermission") || msg.includes("denied")) {
        errText = "❌ يجب السماح للمتصفح باستخدام الكاميرا — افتح الإعدادات وأذن للكاميرا ثم أعد المحاولة";
      } else if (msg === "NotFoundError" || msg.includes("ound")) {
        errText = "❌ لم يتم العثور على كاميرا — تأكد من توصيل كاميرا بجهازك";
      } else if (msg === "NotReadableError" || msg.includes("ardware")) {
        errText = "❌ الكاميرا مستخدمة من تطبيق آخر — أغلقه وحاول مجدداً";
      } else if (msg === "OverconstrainedError") {
        errText = "❌ الكاميرا لا تدعم الدقة المطلوبة — جرب من متصفح آخر";
      }
      setErrorMsg(errText);
      setStep("error");
    }
  }, [startLiveness, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const netInfo = getNetworkInfo();
  const nowStr = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-5">
      <PageHeader
        title={mode === "checkout" ? "تسجيل الانصراف" : "تسجيل الحضور"}
        subtitle={mode === "checkout" ? "سجّل نهاية دوامك بالتحقق من وجهك" : "سجّل بداية دوامك بالتحقق من وجهك"}
        icon={Camera}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl glass px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> {navigator.userAgent.split(" ").slice(-1)[0]}</span>
        <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-cyan-400" /> {netInfo.label}</span>
        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {nowStr}</span>
        {locStr && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-400" /> {locStr}</span>}
      </div>

      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <GlassCard className="text-center space-y-5">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-10 w-10 text-primary" />
              </div>
              <div>
                <p className="font-display text-xl font-bold">{mode === "checkout" ? "سجّل انصرافك بوجهك" : "سجّل حضورك بوجهك"}</p>
                <p className="text-sm text-muted-foreground mt-1">ستفتح الكاميرا الأمامية وتتحقق من وجهك تلقائياً</p>
              </div>
              <PrimaryButton onClick={startCamera} className="w-full py-4 text-base gap-2">
                <Camera className="h-5 w-5" /> {mode === "checkout" ? "افتح الكاميرا وسجّل انصرافي" : "افتح الكاميرا وسجّل حضوري"}
              </PrimaryButton>
            </GlassCard>
          </motion.div>
        )}

        {step === "camera" && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="text-center border-primary/30">
              <div className="relative mx-auto overflow-hidden rounded-3xl bg-black" style={{ aspectRatio: "3/4", maxHeight: "52vh" }}>
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-36 rounded-full border-4 border-dashed border-primary/70" />
                </div>
                {streamReady && countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <motion.span key={countdown} initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="font-display text-7xl font-black text-white drop-shadow-2xl">{countdown}</motion.span>
                  </div>
                )}
                {!streamReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="h-10 w-10 animate-spin text-white/70" />
                  </div>
                )}
              </div>
              <canvas ref={sampleRef} width={SAMPLE_W} height={SAMPLE_H} className="hidden" />
              <canvas ref={canvasRef} className="hidden" />
              <div className={`mt-4 rounded-2xl px-4 py-2.5 text-sm font-bold
                ${livenessOk ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                : countdown > 0 ? "bg-primary/10 text-primary border border-primary/20 animate-pulse"
                : "bg-amber-400/10 text-amber-500 border border-amber-400/20"}`}>
                {countdown > 0 ? `استعد... ${countdown}` : livenessMsg}
              </div>
              <button onClick={() => { stopCamera(); setStep("idle"); }} className="mt-3 text-sm text-muted-foreground hover:text-foreground transition">إلغاء</button>
            </GlassCard>
          </motion.div>
        )}

        {step === "submitting" && (
          <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="text-center py-14">
              <RefreshCw className="mx-auto mb-4 h-14 w-14 animate-spin text-primary" />
              <p className="font-display text-xl font-bold">{mode === "checkout" ? "جارٍ تسجيل الانصراف..." : "جارٍ تسجيل الحضور..."}</p>
            </GlassCard>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <GlassCard className="text-center border-emerald-400/40 py-10">
              <CheckCircle2 className="mx-auto mb-3 h-16 w-16 text-emerald-400" />
              <p className="font-display text-2xl font-black text-emerald-400">
                {result?.already ? "سجّلت بالفعل ✅" : mode === "checkout" ? "تم تسجيل الانصراف ✅" : "تم تسجيل الحضور ✅"}
              </p>
              {result && !result.already && mode === "checkin" && (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-muted-foreground">الوقت: <span className="font-bold text-foreground">{formatTime12h(result.check_time)}</span></p>
                  {result.is_late
                    ? <p className="text-amber-400 font-bold">⚠️ متأخر — خصم {result.deduction} ج.م</p>
                    : <p className="text-emerald-400 font-bold">في الموعد 🎉</p>}
                </div>
              )}
              {result && !result.already && mode === "checkout" && (
                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-muted-foreground">وقت الانصراف: <span className="font-bold text-foreground">{formatTime12h(result.checkout_time)}</span></p>
                  {result.worked_hours != null && <p className="text-emerald-400 font-bold">ساعات العمل: {result.worked_hours} ساعة</p>}
                </div>
              )}
              <button onClick={() => { setStep("idle"); setResult(null); }} className="mt-5 text-sm text-muted-foreground hover:text-foreground transition">تسجيل مجدداً</button>
            </GlassCard>
          </motion.div>
        )}

        {step === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="text-center border-red-400/40 py-8">
              <XCircle className="mx-auto mb-3 h-12 w-12 text-red-400" />
              <p className="font-display text-lg font-bold text-red-400">حدث خطأ</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
              <PrimaryButton onClick={startCamera} className="mt-5 px-8 gap-2">
                <Camera className="h-4 w-4" /> حاول مجدداً
              </PrimaryButton>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════
   ROOT — desktop sees QR, mobile sees camera
════════════════════════════════ */
export default function QRScan() {
  const { user } = useAuth();
  const mobile = isMobileDevice();
  if (mobile) return <MobileCamera user={user} />;
  return <DesktopQR user={user} />;
}
