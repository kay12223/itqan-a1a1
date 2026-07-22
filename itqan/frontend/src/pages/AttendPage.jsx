/**
 * /attend/:token  — Standalone kiosk attendance page
 *
 * Completely independent from the main app UI.
 * Flow:
 *   1. If not logged in → mini inline login (no redirect to main app)
 *   2. Camera opens automatically
 *   3. Liveness check (face motion)
 *   4. Confirms with selfie + time → done
 *
 * QR code is displayed by the manager.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { getDeviceId } from "@/lib/deviceId";
import { getDeviceInfo as getDeviceInfoFull, getNetworkInfo } from "@/lib/deviceInfo";

/* ── constants ── */
const API = "/api";
const SAMPLE_W = 80;
const SAMPLE_H = 60;
const THRESHOLD = 6; // liveness pixel-diff threshold

function getDeviceInfo() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    const m = ua.match(/Android[^;]*;\s*([^)]+)\)/);
    return m ? `Android — ${m[1].trim()}` : "Android";
  }
  return "هاتف";
}

function frameDiff(a, b) {
  if (!a || !b || a.data.length !== b.data.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    sum += Math.abs(a.data[i] - b.data[i]);
    sum += Math.abs(a.data[i + 1] - b.data[i + 1]);
    sum += Math.abs(a.data[i + 2] - b.data[i + 2]);
  }
  return sum / (a.data.length / 4);
}

/* ════════════════════════════════════════════════════════
   STEP 1 — Mini login
════════════════════════════════════════════════════════ */
function MiniLogin({ onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`${API}/auth/login`, {
        identifier: identifier.trim(),
        password,
        role: "member",
      });
      onLogin(data.access_token, data.user || { name: identifier });
    } catch (err) {
      setError(err.response?.data?.detail || "اسم المستخدم أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginCard}>
      <div style={styles.loginIcon}>👤</div>
      <h2 style={styles.loginTitle}>تسجيل الدخول</h2>
      <p style={styles.loginSub}>ادخل بياناتك لتسجيل حضورك</p>

      <form onSubmit={submit} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="اسم المستخدم أو البريد"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          autoComplete="username"
          dir="rtl"
        />
        <input
          style={styles.input}
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          dir="rtl"
        />
        {error && <p style={styles.errorText}>{error}</p>}
        <button type="submit" style={{
          ...styles.bigBtn,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }} disabled={loading}>
          {loading ? "جارٍ التحقق..." : "دخول وتسجيل الحضور ←"}
        </button>
      </form>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STEP 2 — Camera + Liveness
════════════════════════════════════════════════════════ */
function CameraStep({ token, authToken, userName, onDone, onError }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const sampleRef  = useRef(null);
  const streamRef  = useRef(null);
  const livRef     = useRef(null);
  const livTmRef   = useRef(null);
  const submitTmRef = useRef(null);
  const cdRef      = useRef(null);
  const sessionRef = useRef(0);

  const [ready, setReady]       = useState(false);
  const [cd, setCd]             = useState(3);
  const [msg, setMsg]           = useState("ضع وجهك أمام الكاميرا...");
  const [msgOk, setMsgOk]       = useState(false);
  const [locStr, setLocStr]     = useState("");
  const [brightness, setBrightness] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setLocStr(`${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`),
        () => {}, { timeout: 6000 }
      );
    }
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    [cdRef, livRef].forEach((r) => r.current && (clearInterval(r.current), (r.current = null)));
    [livTmRef, submitTmRef].forEach((r) => r.current && (clearTimeout(r.current), (r.current = null)));
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setReady(false);
  }, []);

  const capture = useCallback(() => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return null;
    c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
    c.getContext("2d").drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.8);
  }, []);

  const submit = useCallback(async (photo) => {
    stop();
    const netInfo = getNetworkInfo();
    try {
      const { data } = await axios.post(`${API}/attendance/qr-checkin`,
        {
          token,
          device_info: getDeviceInfoFull(),
          device_id: getDeviceId(),
          location: locStr,
          photo,
          network_name: netInfo.label,
          network_type: netInfo.type,   // wifi | cellular | ethernet | unknown
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      onDone(photo, data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      onError(typeof detail === "string" ? detail : "حدث خطأ — حاول مجدداً");
    }
  }, [token, authToken, locStr, stop, onDone, onError]);

  const startLiveness = useCallback((video, sid) => {
    const sample = sampleRef.current;
    if (!sample) return;
    const ctx = sample.getContext("2d");
    const rw = SAMPLE_W * 0.4, rh = SAMPLE_H * 0.4;
    const rx = (SAMPLE_W - rw) / 2, ry = (SAMPLE_H - rh) / 2;
    let frames = [], diffs = [];

    livRef.current = setInterval(() => {
      if (sessionRef.current !== sid) return;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);

      // ── Brightness check ──────────────────────────────────────────────
      const full = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      let lum = 0;
      for (let i = 0; i < full.data.length; i += 4) {
        lum += 0.299 * full.data[i] + 0.587 * full.data[i + 1] + 0.114 * full.data[i + 2];
      }
      setBrightness(Math.round(lum / (full.data.length / 4)));

      const f = ctx.getImageData(rx, ry, rw, rh);
      frames.push(f);
      if (frames.length > 1) {
        diffs.push(frameDiff(frames[frames.length - 2], frames[frames.length - 1]));
        if (diffs.length > 12) diffs = diffs.slice(-12);
        if (diffs.slice(-4).filter((d) => d > THRESHOLD).length >= 3) {
          clearInterval(livRef.current); livRef.current = null;
          clearTimeout(livTmRef.current); livTmRef.current = null;
          setMsg("✅ تم التعرف على وجهك..."); setMsgOk(true);
          submitTmRef.current = setTimeout(() => {
            if (sessionRef.current !== sid) return;
            submit(capture());
          }, 600);
        } else {
          setMsg("حرّك رأسك قليلاً نحو اليمين أو اليسار...");
        }
      }
    }, 150);

    livTmRef.current = setTimeout(() => {
      if (sessionRef.current !== sid) return;
      clearInterval(livRef.current); livRef.current = null;
      stop();
      onError("انتهت المهلة — تأكد من الإضاءة وحرّك وجهك أمام الكاميرا");
    }, 20000);
  }, [capture, submit, stop, onError]);

  useEffect(() => {
    const sid = sessionRef.current;
    let mounted = true;

    (async () => {
      try {
        // Front camera ONLY — try exact first, fall back to hint if browser doesn't support exact
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { exact: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        }
        if (!mounted || sessionRef.current !== sid) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.onloadedmetadata = () => {
            video.play().catch(() => {});
            setReady(true);
            let c = 3; setCd(c);
            cdRef.current = setInterval(() => {
              if (sessionRef.current !== sid) { clearInterval(cdRef.current); cdRef.current = null; return; }
              c--;
              if (c > 0) { setCd(c); }
              else {
                clearInterval(cdRef.current); cdRef.current = null; setCd(0);
                setMsg("حرّك رأسك قليلاً...");
                startLiveness(video, sid);
              }
            }, 1000);
          };
        }
      } catch (err) {
        if (!mounted) return;
        onError(err?.message?.toLowerCase().includes("ermission")
          ? "❌ يجب السماح للمتصفح باستخدام الكاميرا"
          : "❌ تعذّر فتح الكاميرا");
      }
    })();

    return () => { mounted = false; stop(); };
  }, []); // eslint-disable-line

  // brightness band colours
  const brtBg    = brightness === null ? "transparent"
    : brightness < 40  ? "rgba(239,68,68,0.15)"
    : brightness < 80  ? "rgba(251,191,36,0.15)"
    : "rgba(34,197,94,0.15)";
  const brtColor = brightness === null ? "#94a3b8"
    : brightness < 40  ? "#f87171"
    : brightness < 80  ? "#fbbf24"
    : "#22c55e";
  const brtBorder = brightness === null ? "rgba(255,255,255,0.1)"
    : brightness < 40  ? "#ef4444"
    : brightness < 80  ? "#fbbf24"
    : "#22c55e";
  const brtMsg = brightness === null ? ""
    : brightness < 40  ? "⚠️ الإضاءة ضعيفة جداً — اذهب لمكان أكثر إضاءة"
    : brightness < 80  ? "💡 الإضاءة متوسطة — حاول تحسين الإضاءة"
    : "✅ الإضاءة جيدة";

  return (
    <div style={styles.cameraWrap}>
      {/* Lighting indicator — shown once liveness starts */}
      {brightness !== null && (
        <div style={{
          width: "100%", padding: "10px 14px", borderRadius: 12,
          border: `1px solid ${brtBorder}`, background: brtBg,
          color: brtColor, fontSize: 13, fontWeight: 700, textAlign: "center",
        }}>
          {brtMsg}
        </div>
      )}

      {/* Video */}
      <div style={styles.videoOuter}>
        <video
          ref={videoRef} autoPlay playsInline muted
          style={{ ...styles.video, transform: "scaleX(-1)" }}
        />
        {/* Oval guide */}
        <div style={styles.oval} />
        {/* Dark-room overlay */}
        {brightness !== null && brightness < 40 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            alignItems: "flex-end", justifyContent: "center", paddingBottom: 12,
            pointerEvents: "none",
          }}>
            <span style={{
              background: "rgba(0,0,0,0.65)", color: "#f87171",
              fontSize: 12, fontWeight: 800,
              padding: "6px 14px", borderRadius: 20,
            }}>💡 زد الإضاءة</span>
          </div>
        )}
        {/* Countdown */}
        {ready && cd > 0 && (
          <div style={styles.cdOverlay}>
            <span style={styles.cdNum}>{cd}</span>
          </div>
        )}
        {!ready && (
          <div style={styles.cdOverlay}>
            <span style={{ fontSize: 40 }}>📷</span>
          </div>
        )}
      </div>

      {/* Hidden canvases */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <canvas ref={sampleRef} width={SAMPLE_W} height={SAMPLE_H} style={{ display: "none" }} />

      {/* Status bar */}
      <div style={{
        ...styles.statusBar,
        background: msgOk ? "rgba(34,197,94,0.15)" : cd > 0 ? "rgba(99,102,241,0.15)" : "rgba(251,191,36,0.15)",
        borderColor: msgOk ? "#22c55e" : cd > 0 ? "#6366f1" : "#fbbf24",
        color: msgOk ? "#22c55e" : cd > 0 ? "#a5b4fc" : "#fbbf24",
      }}>
        {cd > 0 ? `استعد... ${cd}` : msg}
      </div>

      <p style={styles.userName}>{userName}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STEP 3 — Done
════════════════════════════════════════════════════════ */
function DoneStep({ photo, result, userName }) {
  const timeStr = result?.check_time || new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const isLate  = result?.is_late;
  const already = result?.already;

  return (
    <div style={styles.doneWrap}>
      {/* Face photo — large rectangle, not small circle */}
      {photo && (
        <div style={styles.facePhotoWrap}>
          <img
            src={photo}
            alt="صورة الحضور"
            style={styles.facePhoto}
          />
          <div style={styles.facePhotoBadge}>✅ تم التسجيل</div>
        </div>
      )}

      <div style={styles.checkIcon}>{already ? "✅" : "✅"}</div>
      <h2 style={styles.doneTitle}>
        {already ? "سجّلت حضورك بالفعل" : "تم تسجيل الحضور"}
      </h2>
      <p style={styles.doneName}>{userName}</p>
      <p style={styles.doneTime}>{timeStr}</p>

      {!already && (
        <div style={{
          ...styles.doneBadge,
          background: isLate ? "rgba(251,191,36,0.15)" : "rgba(34,197,94,0.15)",
          borderColor: isLate ? "#fbbf24" : "#22c55e",
          color: isLate ? "#fbbf24" : "#22c55e",
        }}>
          {isLate
            ? `⚠️ متأخر — خصم ${result?.deduction || 0} ج.م`
            : "في الموعد 🎉"}
        </div>
      )}

      <p style={styles.doneClose}>يمكنك إغلاق هذه الشاشة</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   STEP — Error
════════════════════════════════════════════════════════ */
function ErrorStep({ msg, onRetry }) {
  return (
    <div style={styles.errorWrap}>
      <div style={{ fontSize: 64 }}>❌</div>
      <h2 style={{ color: "#f87171", fontSize: 22, fontWeight: 800, marginBottom: 12 }}>حدث خطأ</h2>
      <p style={{ color: "#94a3b8", fontSize: 15, textAlign: "center", lineHeight: 1.6, marginBottom: 28 }}>{msg}</p>
      <button style={styles.bigBtn} onClick={onRetry}>حاول مجدداً</button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════ */
export default function AttendPage() {
  const { token } = useParams();

  const [authToken, setAuthToken] = useState(null);
  const [userName,  setUserName]  = useState("");
  const [step, setStep]           = useState("init"); // init|login|camera|done|error
  const [photo, setPhoto]         = useState(null);
  const [result, setResult]       = useState(null);
  const [errMsg, setErrMsg]       = useState("");

  // On mount: check if already logged in as a member
  useEffect(() => {
    const saved = localStorage.getItem("itqan_token");
    if (!saved) { setStep("login"); return; }
    const controller = new AbortController();
    axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${saved}` },
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (data.role === "member") {
          setAuthToken(saved);
          setUserName(data.name || "");
          setStep("camera");
        } else {
          setStep("login");
        }
      })
      .catch((e) => { if (!axios.isCancel(e)) setStep("login"); });
    return () => controller.abort();
  }, []);

  const handleLogin = (tok, user) => {
    setAuthToken(tok);
    setUserName(user.name || user.username || "");
    setStep("camera");
  };

  const handleDone = (p, r) => {
    setPhoto(p); setResult(r); setStep("done");
  };

  const handleError = (msg) => {
    setErrMsg(msg); setStep("error");
  };

  const handleRetry = () => {
    setStep(authToken ? "camera" : "login");
    setErrMsg(""); setPhoto(null); setResult(null);
  };

  return (
    <div style={styles.root} dir="rtl">
      {/* Top strip */}
      <div style={styles.topStrip}>
        <span style={styles.topLabel}>تسجيل الحضور</span>
        <span style={styles.topDot} />
      </div>

      <div style={styles.content}>
        {step === "init" && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 15 }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            جارٍ التحقق...
          </div>
        )}
        {step === "login" && <MiniLogin onLogin={handleLogin} />}
        {step === "camera" && (
          <CameraStep
            token={token}
            authToken={authToken}
            userName={userName}
            onDone={handleDone}
            onError={handleError}
          />
        )}
        {step === "done"  && <DoneStep photo={photo} result={result} userName={userName} />}
        {step === "error" && <ErrorStep msg={errMsg} onRetry={handleRetry} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   INLINE STYLES  (no tailwind dependency)
════════════════════════════════════════════════════════ */
const styles = {
  root: {
    minHeight: "100dvh",
    background: "linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Segoe UI', 'Cairo', Arial, sans-serif",
    color: "#f1f5f9",
    overflowX: "hidden",
  },
  topStrip: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  topLabel: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: "0.05em",
    color: "#94a3b8",
    textTransform: "uppercase",
  },
  topDot: {
    width: 8, height: 8,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 8px #22c55e",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px 20px 32px",
  },

  /* Login */
  loginCard: {
    width: "100%",
    maxWidth: 380,
    textAlign: "center",
    padding: "8px 0",
  },
  loginIcon: { fontSize: 56, marginBottom: 12 },
  loginTitle: { fontSize: 24, fontWeight: 800, marginBottom: 6, color: "#f1f5f9" },
  loginSub: { fontSize: 14, color: "#94a3b8", marginBottom: 28 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#f1f5f9",
    fontSize: 16,
    outline: "none",
    boxSizing: "border-box",
    textAlign: "right",
  },
  errorText: { color: "#f87171", fontSize: 13, textAlign: "center", margin: 0 },
  bigBtn: {
    width: "100%",
    padding: "16px",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 17,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 4,
  },

  /* Camera */
  cameraWrap: {
    width: "100%",
    maxWidth: 400,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  videoOuter: {
    position: "relative",
    width: "100%",
    maxWidth: 360,
    aspectRatio: "3 / 4",
    borderRadius: 24,
    overflow: "hidden",
    background: "#000",
    border: "2px solid rgba(99,102,241,0.5)",
    boxShadow: "0 0 40px rgba(99,102,241,0.2)",
  },
  video: {
    width: "100%", height: "100%",
    objectFit: "cover",
    display: "block",
  },
  oval: {
    position: "absolute",
    top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    width: "55%", height: "65%",
    border: "3px dashed rgba(99,102,241,0.7)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  cdOverlay: {
    position: "absolute", inset: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.35)",
  },
  cdNum: {
    fontSize: 80,
    fontWeight: 900,
    color: "#fff",
    textShadow: "0 2px 20px rgba(0,0,0,0.8)",
  },
  statusBar: {
    width: "100%",
    padding: "12px 18px",
    borderRadius: 14,
    border: "1px solid",
    textAlign: "center",
    fontSize: 15,
    fontWeight: 700,
    transition: "all 0.4s",
  },
  userName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#94a3b8",
    margin: 0,
  },

  /* Done */
  doneWrap: {
    width: "100%",
    maxWidth: 360,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
    textAlign: "center",
  },
  facePhotoWrap: {
    position: "relative",
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    overflow: "hidden",
    border: "4px solid #22c55e",
    boxShadow: "0 0 40px rgba(34,197,94,0.4)",
  },
  facePhoto: {
    width: "100%",
    height: 260,
    objectFit: "cover",
    objectPosition: "center top",
    display: "block",
    transform: "scaleX(-1)",
  },
  facePhotoBadge: {
    position: "absolute",
    bottom: 10, left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(34,197,94,0.9)",
    color: "#fff",
    fontSize: 13, fontWeight: 800,
    padding: "6px 18px", borderRadius: 20,
    backdropFilter: "blur(6px)",
  },
  checkIcon: { fontSize: 56, lineHeight: 1 },
  doneTitle: { fontSize: 26, fontWeight: 900, color: "#22c55e", margin: 0 },
  doneName:  { fontSize: 18, fontWeight: 700, color: "#f1f5f9", margin: 0 },
  doneTime:  { fontSize: 42, fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" },
  doneBadge: {
    padding: "10px 20px",
    borderRadius: 12,
    border: "1px solid",
    fontSize: 15,
    fontWeight: 700,
  },
  doneClose: { fontSize: 13, color: "#475569", marginTop: 8 },

  /* Error */
  errorWrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8,
    maxWidth: 340, textAlign: "center",
  },
};
