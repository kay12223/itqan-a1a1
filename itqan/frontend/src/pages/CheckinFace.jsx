/**
 * /checkin/:token  — Mobile-only face check-in page
 * Opened when employee scans the manager's QR code.
 * Flow: validate token → open front camera → liveness check → submit
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CheckCircle2, XCircle, Monitor, Smartphone,
  AlertTriangle, RefreshCw, Clock,
} from "lucide-react";
import api from "@/lib/apiClient";
import { getDeviceId, getDeviceInfo, getNetworkInfo, isMobileDevice } from "@/lib/deviceInfo";
import { useAuth } from "@/context/AuthContext";
import { formatTime12h } from "@/lib/utils";

/** Compare two ImageData arrays — returns average pixel diff 0-255 */
function frameDiff(a, b) {
  if (!a || !b || a.data.length !== b.data.length) return 0;
  let total = 0;
  const len = a.data.length;
  for (let i = 0; i < len; i += 4) {
    total += Math.abs(a.data[i] - b.data[i]);     // R
    total += Math.abs(a.data[i + 1] - b.data[i + 1]); // G
    total += Math.abs(a.data[i + 2] - b.data[i + 2]); // B
  }
  return total / (len / 4);
}

const LIVENESS_THRESHOLD = 6; // average pixel diff indicating real motion
const SAMPLE_W = 80;
const SAMPLE_H = 60;

/* ── main component ── */
export default function CheckinFace() {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = isMobileDevice();

  // steps: init | camera | liveness | submitting | done | error
  const [step, setStep]       = useState("init");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult]   = useState(null);
  const [donePhoto, setDonePhoto] = useState(null);
  const [brightness, setBrightness] = useState(null); // 0-255 average luminance

  // camera & liveness
  const [streamReady, setStreamReady] = useState(false);
  const [countdown, setCountdown]     = useState(3);
  const [livenessOk, setLivenessOk]  = useState(false);
  const [livenessMsg, setLivenessMsg] = useState("ابدأ بتحريك رأسك قليلاً...");
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const sampleRef     = useRef(null);
  const streamRef     = useRef(null);
  const framesRef     = useRef([]);
  const cdRef         = useRef(null);
  const livenessRef   = useRef(null);
  const submitTmRef   = useRef(null);   // post-liveness submit timeout
  const sessionRef    = useRef(0);      // incremented on every new camera session
  const livTimeoutRef = useRef(null);   // liveness overall timeout

  // location
  const [locStr, setLocStr] = useState("");
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setLocStr(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`),
        () => {},
        { timeout: 8000, enableHighAccuracy: false }
      );
    }
  }, []);

  /* ── Auth redirect ── */
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
    }
  }, [user, authLoading, navigate, location.pathname]);

  /* ── Stop camera — clears ALL pending timers/streams ── */
  const stopCamera = useCallback(() => {
    sessionRef.current += 1;                               // invalidate any in-flight callbacks
    if (cdRef.current)       { clearInterval(cdRef.current);       cdRef.current = null; }
    if (livenessRef.current) { clearInterval(livenessRef.current); livenessRef.current = null; }
    if (livTimeoutRef.current){ clearTimeout(livTimeoutRef.current); livTimeoutRef.current = null; }
    if (submitTmRef.current) { clearTimeout(submitTmRef.current);  submitTmRef.current = null; }
    if (streamRef.current)   { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setStreamReady(false);
    framesRef.current = [];
  }, []);

  /* ── Capture photo ── */
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.75);
  }, []);

  /* ── Submit to backend ── */
  const submitCheckin = useCallback(async (photo) => {
    setStep("submitting");
    stopCamera();
    const netInfo = getNetworkInfo();
    try {
      const { data } = await api.post("/attendance/qr-checkin", {
        token,
        device_info: getDeviceInfo(),
        device_id: getDeviceId(),
        location: locStr,
        photo,
        network_name: netInfo.label,
        network_type: netInfo.type,          // wifi | cellular | ethernet | unknown
      });
      setDonePhoto(photo);
      setResult(data);
      setStep("done");
    } catch (e) {
      const detail = e.response?.data?.detail;
      setErrorMsg(
        typeof detail === "string" ? detail
        : "حدث خطأ — تأكد من اتصالك بالإنترنت وحاول مجدداً"
      );
      setStep("error");
    }
  }, [token, locStr, stopCamera]);

  /* ── Liveness: compare CENTER ROI frames for real motion ── */
  const startLivenessCheck = useCallback((video, sessionId) => {
    const sample = sampleRef.current;
    if (!sample) return;
    const ctx = sample.getContext("2d");
    let diffs = [];
    framesRef.current = [];

    // Capture only center 40% of frame (where face is) to reduce background noise
    const roiW = SAMPLE_W * 0.4;
    const roiH = SAMPLE_H * 0.4;
    const roiX = (SAMPLE_W - roiW) / 2;
    const roiY = (SAMPLE_H - roiH) / 2;

    livenessRef.current = setInterval(() => {
      if (sessionRef.current !== sessionId) return; // session invalidated
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);

      // ── Brightness check (full frame) ──────────────────────────────────
      const fullFrame = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      let lum = 0;
      for (let i = 0; i < fullFrame.data.length; i += 4) {
        lum += 0.299 * fullFrame.data[i] + 0.587 * fullFrame.data[i + 1] + 0.114 * fullFrame.data[i + 2];
      }
      setBrightness(Math.round(lum / (fullFrame.data.length / 4)));

      const frame = ctx.getImageData(roiX, roiY, roiW, roiH);
      framesRef.current.push(frame);
      if (framesRef.current.length > 1) {
        const diff = frameDiff(
          framesRef.current[framesRef.current.length - 2],
          framesRef.current[framesRef.current.length - 1]
        );
        diffs.push(diff);
        if (diffs.length > 12) diffs = diffs.slice(-12);
        // Require sustained motion: 4 consecutive diffs above threshold
        const sustained = diffs.slice(-4).filter((d) => d > LIVENESS_THRESHOLD).length >= 3;
        if (sustained) {
          clearInterval(livenessRef.current);
          livenessRef.current = null;
          clearTimeout(livTimeoutRef.current);
          livTimeoutRef.current = null;
          setLivenessOk(true);
          setLivenessMsg("✅ تم التحقق من وجهك — جارٍ التسجيل...");
          submitTmRef.current = setTimeout(() => {
            if (sessionRef.current !== sessionId) return; // cancelled in the meantime
            const photo = capturePhoto();
            submitCheckin(photo);
          }, 500);
        } else {
          setLivenessMsg("حرّك رأسك قليلاً نحو اليمين أو اليسار...");
        }
      }
    }, 150);

    // Overall liveness timeout: 20 seconds → ask to retry
    livTimeoutRef.current = setTimeout(() => {
      if (sessionRef.current !== sessionId) return;
      clearInterval(livenessRef.current);
      livenessRef.current = null;
      stopCamera();
      setErrorMsg("انتهت مهلة التحقق — تأكد من وجود إضاءة جيدة وحرّك رأسك أمام الكاميرا");
      setStep("error");
    }, 20000);
  }, [capturePhoto, submitCheckin, stopCamera]);

 /* ── Start camera ── */
  const startCamera = useCallback(async () => {
    stopCamera();                                     // clear any previous session first
    const sessionId = sessionRef.current;             // snapshot current session id
    setStep("camera");
    setStreamReady(false);
    setCountdown(3);
    setLivenessOk(false);
    setLivenessMsg("ابدأ بتحريك رأسك قليلاً...");

    setTimeout(async () => {
      try {
        // Front camera ONLY — no fallback to rear camera (must be selfie/user-facing)
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } catch {
          // Fallback: some browsers don't support exact — try without exact constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        }
        if (sessionRef.current !== sessionId) {
          // user cancelled while getUserMedia was pending
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.setAttribute("playsinline", ""); // required on iOS Safari
          video.setAttribute("muted", "");
          video.onloadedmetadata = () => {
            video.play().catch(() => {});
            setStreamReady(true);

            // 3-second countdown, then start liveness check
            let c = 3;
            setCountdown(c);
            cdRef.current = setInterval(() => {
              if (sessionRef.current !== sessionId) {
                clearInterval(cdRef.current);
                cdRef.current = null;
                return;
              }
              c -= 1;
              if (c > 0) {
                setCountdown(c);
              } else {
                clearInterval(cdRef.current);
                cdRef.current = null;
                setCountdown(0);
                startLivenessCheck(video, sessionId);
              }
            }, 1000);
          };
        }
      } catch (err) {
        const name = err?.name || "";
        const msg  = err?.message || "";
        let errText = "❌ تعذّر فتح الكاميرا — حاول مجدداً";
        if (name === "NotAllowedError" || msg.includes("ermission") || msg.includes("denied")) {
          errText = "❌ الكاميرا محظورة — اذهب لإعدادات المتصفح وأذن للكاميرا، ثم أعد تحميل الصفحة";
        } else if (name === "NotFoundError" || msg.includes("ound")) {
          errText = "❌ لا توجد كاميرا على جهازك";
        } else if (name === "NotReadableError" || msg.includes("ardware")) {
          errText = "❌ الكاميرا مشغولة من تطبيق آخر — أغلق التطبيقات الأخرى وحاول مجدداً";
        }
        setErrorMsg(errText);
        setStep("error");
      }
    }, 300);
  }, [startLivenessCheck, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  /* ── Desktop block ── */
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
          <Monitor className="mx-auto mb-4 h-16 w-16 text-muted-foreground/40" />
          <h1 className="font-display text-2xl font-black mb-2">للهاتف فقط</h1>
          <p className="text-muted-foreground text-sm">
            هذه الصفحة تعمل على الهاتف فقط.<br />
            امسح كود QR بكاميرا هاتفك لتسجيل حضورك.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-primary">
            <Smartphone className="h-5 w-5" />
            <span className="text-sm font-bold">افتحها من هاتفك</span>
          </div>
        </div>
      </div>
    );
  }

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-6 pb-4">
        <div>
          <h1 className="font-display text-2xl font-black">تسجيل الحضور</h1>
          <p className="text-sm text-muted-foreground mt-0.5">مرحباً، {user.name}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
          <Camera className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex-1 px-5 pb-8 space-y-4">
        <AnimatePresence mode="wait">

          {/* INIT — ready to start */}
          {step === "init" && (
            <motion.div key="init" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-5">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">سجّل حضورك الآن</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ستفتح الكاميرا الأمامية للتحقق من وجهك
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-400/10 border border-amber-400/20 px-4 py-3 text-xs text-amber-500">
                  <AlertTriangle className="inline h-3.5 w-3.5 me-1" />
                  تأكد من وجود إضاءة جيدة وأن وجهك ظاهر بوضوح
                </div>
                <button
                  onClick={startCamera}
                  className="w-full rounded-2xl gradient-primary py-4 text-base font-black text-white shadow-lg active:opacity-80 transition"
                >
                  افتح الكاميرا وسجّل حضوري
                </button>
              </div>

              {/* Steps */}
              <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
                <p className="font-bold text-sm mb-1">كيف يعمل؟</p>
                {[
                  { n: "1", t: "افتح الكاميرا", d: "اضغط الزر أعلاه" },
                  { n: "2", t: "حرّك رأسك", d: "تحقق أنك شخص حقيقي وليس صورة" },
                  { n: "3", t: "تسجيل تلقائي", d: "يتم تسجيل حضورك فوراً" },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-black text-white">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{s.t}</p>
                      <p className="text-xs text-muted-foreground">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CAMERA */}
          {step === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-3xl border border-primary/30 bg-card p-4 text-center">
                {/* Lighting indicator */}
                {brightness !== null && (
                  <div className={`mb-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${
                    brightness < 40
                      ? "bg-red-500/15 border border-red-500/30 text-red-400"
                      : brightness < 80
                      ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                      : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                  }`}>
                    {brightness < 40
                      ? "⚠️ الإضاءة ضعيفة جداً — اذهب لمكان أكثر إضاءة"
                      : brightness < 80
                      ? "💡 الإضاءة متوسطة — حاول تحسين الإضاءة"
                      : "✅ الإضاءة جيدة"}
                  </div>
                )}

                {/* Video */}
                <div className="relative mx-auto overflow-hidden rounded-3xl bg-black"
                     style={{ aspectRatio: "3/4", maxHeight: "55vh" }}>
                  <video
                    ref={videoRef} autoPlay playsInline muted
                    className="h-full w-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                  />
                  {/* Face oval guide */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-52 w-40 rounded-full border-4 border-dashed border-primary/70" />
                  </div>
                  {/* Dark overlay when lighting is too low */}
                  {brightness !== null && brightness < 40 && (
                    <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
                      <span className="rounded-full bg-black/60 px-4 py-2 text-xs font-bold text-red-400">
                        💡 زد الإضاءة
                      </span>
                    </div>
                  )}
                  {/* Countdown overlay */}
                  {streamReady && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <motion.span
                        key={countdown}
                        initial={{ scale: 2.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="font-display text-7xl font-black text-white drop-shadow-2xl"
                      >
                        {countdown}
                      </motion.span>
                    </div>
                  )}
                  {!streamReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw className="h-10 w-10 animate-spin text-white/70" />
                    </div>
                  )}
                </div>

                {/* hidden sample canvas for liveness */}
                <canvas ref={sampleRef} width={SAMPLE_W} height={SAMPLE_H} className="hidden" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Status */}
                <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                  livenessOk
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    : countdown > 0
                    ? "bg-primary/10 text-primary border border-primary/20 animate-pulse"
                    : "bg-amber-400/10 text-amber-500 border border-amber-400/20"
                }`}>
                  {countdown > 0 ? `استعد... ${countdown}` : livenessMsg}
                </div>

                <button onClick={() => { stopCamera(); setStep("init"); }}
                  className="mt-3 text-sm text-muted-foreground hover:text-foreground transition">
                  إلغاء
                </button>
              </div>
            </motion.div>
          )}

          {/* SUBMITTING */}
          {step === "submitting" && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="rounded-3xl border border-border bg-card py-16 text-center">
                <RefreshCw className="mx-auto mb-4 h-14 w-14 animate-spin text-primary" />
                <p className="font-display text-xl font-bold">جارٍ تسجيل حضورك...</p>
                <p className="mt-2 text-sm text-muted-foreground">لحظة من فضلك</p>
              </div>
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="rounded-3xl border border-emerald-400/30 bg-card pt-6 pb-10 px-6 text-center space-y-4">
                {/* Large face photo */}
                {donePhoto && (
                  <div className="mx-auto overflow-hidden rounded-3xl border-4 border-emerald-400 shadow-[0_0_40px_rgba(34,197,94,0.4)]"
                       style={{ width: 200, height: 200 }}>
                    <img src={donePhoto} alt="صورة الحضور"
                         className="h-full w-full object-cover"
                         style={{ transform: "scaleX(-1)" }} />
                  </div>
                )}
                <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
                <p className="font-display text-3xl font-black text-emerald-400">
                  {result?.already ? "سجّلت بالفعل ✅" : "تم التسجيل ✅"}
                </p>
                {result && !result.already && (
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      وقت الحضور:{" "}
                      <span className="font-bold text-foreground">{formatTime12h(result.check_time)}</span>
                    </p>
                    {result.is_late ? (
                      <p className="text-amber-400 font-bold">⚠️ متأخر — خصم {result.deduction} ج.م</p>
                    ) : (
                      <p className="text-emerald-400 font-bold">في الموعد — عمل رائع! 🎉</p>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  يمكنك إغلاق هذه النافذة
                </div>
              </div>
            </motion.div>
          )}

          {/* ERROR */}
          {step === "error" && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="rounded-3xl border border-red-400/30 bg-card py-10 px-6 text-center">
                <XCircle className="mx-auto mb-3 h-16 w-16 text-red-400" />
                <p className="font-display text-xl font-bold text-red-400">حدث خطأ</p>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{errorMsg}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => { setStep("init"); setErrorMsg(""); }}
                    className="w-full rounded-2xl gradient-primary py-3.5 text-base font-black text-white"
                  >
                    حاول مجدداً
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
