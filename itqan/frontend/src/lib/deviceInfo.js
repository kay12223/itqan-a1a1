/**
 * Enhanced device & network fingerprinting.
 * Used in every check-in request so the manager can see exactly who, on what device,
 * from what network, checked in.
 */

const DEVICE_ID_KEY = "itqan_device_id";

// ── Persistent device UUID ────────────────────────────────────────────────────
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : "dev-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "dev-" + Date.now().toString(36);
  }
}

// ── UA-based device parsing ───────────────────────────────────────────────────
export function getDeviceLabel() {
  const ua = navigator.userAgent;
  // iPhones
  const iphoneM = ua.match(/iPhone OS ([\d_]+)/);
  if (iphoneM) return `iPhone (iOS ${iphoneM[1].replace(/_/g, ".")})`;
  // iPads
  const ipadM = ua.match(/iPad.*OS ([\d_]+)/);
  if (ipadM) return `iPad (iOS ${ipadM[1].replace(/_/g, ".")})`;
  // Android – try to extract brand/model from the UA
  const androidM = ua.match(/Android ([\d.]+);\s*([^)]+)\)/);
  if (androidM) {
    const ver = androidM[1];
    const rawModel = androidM[2].trim();
    // Clean up common noise
    const model = rawModel.replace(/Build\/[^\s]*/g, "").trim();
    return `Android ${ver} — ${model}`;
  }
  if (/Windows NT 10/.test(ua)) return "Windows 10/11 PC";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Macintosh/.test(ua)) {
    const macM = ua.match(/Mac OS X ([\d_]+)/);
    return macM ? `Mac (macOS ${macM[1].replace(/_/g, ".")})` : "Mac";
  }
  if (/Linux/.test(ua)) return "Linux PC";
  return "جهاز غير محدد";
}

// ── Browser name ─────────────────────────────────────────────────────────────
export function getBrowserLabel() {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Microsoft Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Google Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "متصفح ويب";
}

// ── Network / connection info ─────────────────────────────────────────────────
export function getNetworkInfo() {
  try {
    const conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (conn) {
      const type = conn.type || ""; // wifi | cellular | ethernet | none | unknown
      const eff = conn.effectiveType || ""; // slow-2g | 2g | 3g | 4g
      const downlink = conn.downlink != null ? `${conn.downlink} Mbps` : "";
      const rtt = conn.rtt != null ? `RTT ${conn.rtt}ms` : "";

      // Human-readable type label
      const typeLabel =
        type === "wifi"
          ? "Wi-Fi"
          : type === "cellular"
          ? "بيانات موبايل"
          : type === "ethernet"
          ? "إيثرنت"
          : type === "none"
          ? "بدون إنترنت"
          : "شبكة";

      const parts = [typeLabel, eff.toUpperCase(), downlink, rtt].filter(Boolean);
      return {
        label: parts.join(" | "),
        type: type || "unknown",
        effectiveType: eff || "unknown",
        downlink: conn.downlink ?? null,
      };
    }
  } catch {}
  return {
    label: navigator.onLine ? "متصل بالإنترنت" : "غير متصل",
    type: "unknown",
    effectiveType: "unknown",
    downlink: null,
  };
}

// ── Full device info string (sent to backend) ─────────────────────────────────
export function getDeviceInfo() {
  const device = getDeviceLabel();
  const browser = getBrowserLabel();
  const network = getNetworkInfo();
  const cores = navigator.hardwareConcurrency
    ? `${navigator.hardwareConcurrency} أنوية`
    : "";
  const memory = navigator.deviceMemory ? `${navigator.deviceMemory}GB RAM` : "";
  const screen = `${window.screen.width}x${window.screen.height}`;
  const touch = navigator.maxTouchPoints > 0 ? `تاتش (${navigator.maxTouchPoints})` : "لا تاتش";

  const parts = [
    device,
    browser,
    cores,
    memory,
    `شاشة ${screen}`,
    touch,
    `الشبكة: ${network.label}`,
  ].filter(Boolean);

  return parts.join(" | ");
}

// ── Is this a real mobile device? (multi-signal) ─────────────────────────────
export function isMobileDevice() {
  const uaMatch = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  const touchPoints = navigator.maxTouchPoints > 1;
  const narrowScreen = window.screen.width <= 1024;
  // Need at least UA match OR (touch + narrow screen)
  return uaMatch || (touchPoints && narrowScreen);
}
