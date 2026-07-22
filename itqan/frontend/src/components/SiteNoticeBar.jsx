import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, CheckCircle2, X, Zap } from "lucide-react";
import axios from "axios";

const API = axios.create({ baseURL: "/api" });

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: Zap,
  success: CheckCircle2,
};
const STYLES = {
  info:    "from-blue-500/15 via-blue-500/8 to-transparent border-blue-400/30 text-blue-300",
  warning: "from-amber-500/15 via-amber-500/8 to-transparent border-amber-400/30 text-amber-300",
  error:   "from-red-500/15 via-red-500/8 to-transparent border-red-400/30 text-red-300",
  success: "from-emerald-500/15 via-emerald-500/8 to-transparent border-emerald-400/30 text-emerald-300",
};

export default function SiteNoticeBar() {
  const [notice, setNotice] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await API.get("/void/site-notice");
        if (data.active && data.message) {
          setNotice(data);
          setDismissed(false);
        } else {
          setNotice(null);
        }
      } catch {}
    };
    load();
    const iv = setInterval(load, 20_000);
    return () => clearInterval(iv);
  }, []);

  if (!notice || dismissed) return null;

  const Icon = ICONS[notice.notice_type] || Info;
  const style = STYLES[notice.notice_type] || STYLES.info;

  return (
    <AnimatePresence>
      <motion.div
        key="site-notice"
        initial={{ opacity: 0, y: -30, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className={`relative overflow-hidden border-b bg-gradient-to-l ${style}`}
        style={{ direction: "rtl", zIndex: 50 }}
      >
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/10">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className="flex-1 text-xs font-semibold leading-relaxed">{notice.message}</p>
          <button
            onClick={() => setDismissed(true)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
