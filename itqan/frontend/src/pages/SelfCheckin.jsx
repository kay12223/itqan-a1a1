/**
 * /self-checkin/:employeeId/:token
 *
 * Public page — no JWT login required.
 * Opened when an employee scans their personal QR code from their phone.
 *
 * SECURITY: This page is MOBILE-ONLY.
 * If opened on a desktop/laptop browser it shows a hard block screen,
 * preventing desktop-camera spoofing.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, CheckCircle2, XCircle, Monitor, Smartphone,
  AlertTriangle, RefreshCw, Clock, ShieldAlert,
} from "lucide-react";
import api from "@/lib/apiClient";
import { getDeviceId, getDeviceInfo, getNetworkInfo, isMobileDevice } from "@/lib/deviceInfo";

const SAMPLE_W = 80;
const SAMPLE_H = 60;
const LIVENESS_THRESHOLD = 6;

export default function SelfCheckin() {
  const { employeeId, token } = useParams();
  const mobile = isMobileDevice();

  // ── Desktop hard-block ────────────────────────────────────────────────────
  if (!mobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" dir="rtl">
        <div className="max-w-sm w-full rounded-3xl border border-red-500/30 bg-card p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-10 w-10 text-red-500" />
          </div>
          <h1 className="font-display text-2xl font-black mb-2 text-red-400">محظور على الكمبيوتر</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-4">
            هذه الصفحة تعمل على الهاتف فقط.<br />
            لا يمكن تسجيل الحضور من كمبيوتر أو لابتوب.
          </p>
          <div className="rounded-2xl bg-amber-400/10 border border-amber-400/20 px-4 py-3 text-xs text-amber-500 mb-4">
            <AlertTriangle className="inline h-3.5 w-3.5 me-1" />
            يجب مسح رمز QR بكاميرا هاتفك المحمول فقط
          </div>
          <div className="flex items-center justify-center gap-2 text-primary">
            <Smartphone className="h-5 w-5" />
            <span className="text-sm font-bold">افتحها من هاتفك</span>
          </div>
        </div>
      </div>
    );
  }

  return <SelfCheckinMobile employeeId={employeeId} token={token} />;
}

function SelfCheckinMobile({ employeeId, token }) {
  const [step, setStep]               = useState("idle");
  const [result, setResult]           = useState(null);
  const [errorMsg, setErrorMsg]       = useState("");
  const [streamReady, setStreamReady] = useState(false);
  const [countdown, setCountdown]     = useState(3);
  const [livenessOk, setLivenessOk]  = useState(false);
  const [livenessMsg, setLivenessMsg] = useState("ابدأ بتحريك رأسك قليلاً...");
  const [locStr, setLocStr]           = useState("");

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
      const { data } = await api.post("/self-checkin", {
        employee_id: employeeId,
        token,
        photo,
        device_info: getDeviceInfo(),
        device_id: getDeviceId(),
        location: locStr,
        network_name: netInfo.label,
        network_type: netInfo.type,
      });
      setResult(data);
      setStep("done");
    } catch (e) {
      const detail = e.response?.data?.detail;
      setErrorMsg(typeof detail === "string" ? detail : "حدث خطأ — تأكد من اتصالك بالإنترنت");
      setStep("error");
    }
  }, [employeeId, token, locStr, stopCamera]);

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
          total += Math.abs(curr.data[i]   - prev.data[i]);
          total += Math.abs(curr.data[i+1] - prev.data[i+1]);
          total += Math.abs(curr.data[i+2] - prev.data[i+2]);
        }
        diffs.push(total / (curr.data.length / 4));
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
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        // Fallback: any available camera
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
  }, [startLiveness, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const netInfo = getNetworkInfo();

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-8 pb-4">
        <div>
          <h1 className="font-display text-2xl font-black">تسجيل الحضور</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تحقق بوجهك لتسجيل حضورك</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary">
          <Camera className="h-5 w-5 text-white" />
        </div>
      </div>

      {/* Network/device info strip */}
      <div className="mx-5 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 px-3 py-2 text-[11px] text-muted-foreground">
        <span>📶 {netInfo.label}</span>
        {locStr && <span>📍 {locStr}</span>}
      </div>

      <div className="flex-1 px-5 pb-8 space-y-4">
        <AnimatePresence mode="wait">

          {/* IDLE */}
          {step === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rounded-3xl border border-border bg-card p-6 text-center space-y-5">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">سجّل حضورك بوجهك</p>
                  <p className="text-sm text-muted-foreground mt-1">ستفتح الكاميرا الأمامية للتحقق من أنك أنت</p>
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
            </motion.div>
          )}

          {/* CAMERA */}
          {step === "camera" && (
            <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-3xl border border-primary/30 bg-card p-4 text-center">
                <div className="relative mx-auto overflow-hidden rounded-3xl bg-black"
                     style={{ aspectRatio: "3/4", maxHeight: "55vh" }}>
                  <video ref={videoRef} autoPlay playsInline muted
                    className="h-full w-full object-cover" style={{ transform: "scaleX(-1)" }} />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-52 w-40 rounded-full border-4 border-dashed border-primary/70" />
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
                <div className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold transition-all
                  ${livenessOk ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                  : countdown > 0 ? "bg-primary/10 text-primary border border-primary/20 animate-pulse"
                  : "bg-amber-400/10 text-amber-500 border border-amber-400/20"}`}>
                  {countdown > 0 ? `استعد... ${countdown}` : livenessMsg}
                </div>
                <button onClick={() => { stopCamera(); setStep("idle"); }}
                  className="mt-3 text-sm text-muted-foreground hover:text-foreground transition">إلغاء</button>
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
              <div className="rounded-3xl border border-emerald-400/30 bg-card py-10 px-6 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-20 w-20 text-emerald-400" />
                <p className="font-display text-3xl font-black text-emerald-400">
                  {result?.already ? "سجّلت بالفعل ✅" : "تم التسجيل ✅"}
                </p>
                {result && !result.already && (
                  <div className="mt-4 space-y-2 text-sm">
                    <p className="text-muted-foreground">وقت الحضور: <span className="font-bold text-foreground">{result.check_time}</span></p>
                    {result.is_late
                      ? <p className="text-amber-400 font-bold">⚠️ متأخر — خصم {result.deduction} ج.م</p>
                      : <p className="text-emerald-400 font-bold">في الموعد — عمل رائع! 🎉</p>}
                  </div>
                )}
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> يمكنك إغلاق هذه النافذة
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
                  <button onClick={() => { setStep("idle"); setErrorMsg(""); }}
                    className="w-full rounded-2xl gradient-primary py-3.5 text-base font-black text-white">
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
