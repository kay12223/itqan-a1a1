import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, X, Pin, Bell } from "lucide-react";
import api from "@/lib/apiClient";

export default function SystemBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("itqan_dismissed_banners") || "[]"); } catch { return []; }
  });

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/announcements");
        setAnnouncements(data);
      } catch {}
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem("itqan_dismissed_banners", JSON.stringify(next));
  };

  const visible = announcements.filter((a) => a.pinned && !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      <AnimatePresence>
        {visible.slice(0, 2).map((ann) => (
          <motion.div
            key={ann.id}
            initial={{ opacity: 0, y: -40, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ type: "spring", damping: 20 }}
            className={`relative overflow-hidden border-b border-amber-400/30 ${
              ann.pinned
                ? "bg-gradient-to-l from-amber-400/10 via-amber-400/5 to-transparent"
                : "bg-gradient-to-l from-primary/10 via-primary/5 to-transparent"
            }`}
            style={{ direction: "rtl" }}
          >
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
                {ann.pinned ? (
                  <Pin className="h-3.5 w-3.5 text-amber-400" />
                ) : (
                  <Megaphone className="h-3.5 w-3.5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-black text-amber-400 me-2">{ann.title}</span>
                <span className="text-xs text-muted-foreground truncate">{ann.body}</span>
              </div>
              {ann.author && (
                <span className="hidden text-[10px] text-muted-foreground/60 sm:block shrink-0">— {ann.author}</span>
              )}
              <button
                onClick={() => dismiss(ann.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
