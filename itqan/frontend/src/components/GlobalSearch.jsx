import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Users, Clock, Wallet, Boxes, QrCode,
  LayoutDashboard, Bot, MessagesSquare, Building2, ArrowLeft,
} from "lucide-react";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

const STATIC_LINKS = [
  { label: "مركز الادارة", path: "/app/dashboard", icon: LayoutDashboard, role: "manager" },
  { label: "إدارة الموظفين", path: "/app/crew", icon: Users, role: "manager" },
  { label: "الحضور والغياب", path: "/app/attendance", icon: Clock, role: "manager" },
  { label: "البنك والمصروفات", path: "/app/bank", icon: Building2, role: "manager" },
  { label: "المهام والمعدات", path: "/app/operations", icon: Boxes, role: "manager" },
  { label: "المساعد الذكي", path: "/app/assistant", icon: Bot },
  { label: "شات الموظفين", path: "/app/chat", icon: MessagesSquare },
  { label: "تسجيل الحضور QR", path: "/app/qr-scan", icon: QrCode, role: "member" },
  { label: "لوحتي", path: "/app/me", icon: LayoutDashboard, role: "member" },
];

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ links: [], crew: [], bank: [] });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults({ links: [], crew: [], bank: [] });
    }
  }, [open]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const doSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults({ links: [], crew: [], bank: [] });
      return;
    }
    setLoading(true);
    try {
      const matchedLinks = STATIC_LINKS.filter((l) => {
        if (l.role && l.role !== user?.role) return false;
        return l.label.includes(q) || l.path.includes(q.toLowerCase());
      });

      let crew = [], bank = [];
      if (user?.role === "manager") {
        try {
          const [cr, bk] = await Promise.all([
            api.get("/crew"),
            api.get("/bank"),
          ]);
          crew = (cr.data || []).filter((c) =>
            c.name?.includes(q) || c.job_title?.includes(q) || c.username?.includes(q)
          ).slice(0, 5);
          bank = (bk.data || []).filter((b) =>
            b.description?.includes(q) || b.person_name?.includes(q) || b.company_name?.includes(q)
          ).slice(0, 5);
        } catch {}
      }

      setResults({ links: matchedLinks, crew, bank });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  const allResults = [
    ...results.links.map((l) => ({ ...l, type: "link" })),
    ...results.crew.map((c) => ({ label: c.name, sub: c.job_title || "موظف", path: "/app/crew", icon: Users, type: "crew" })),
    ...results.bank.map((b) => ({ label: b.description, sub: `${b.amount?.toLocaleString()} ج.م`, path: "/app/bank", icon: Wallet, type: "bank" })),
  ];

  const go = (item) => {
    navigate(item.path);
    onClose();
  };

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border glass shadow-2xl"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
            ) : (
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في الموظفين، المعاملات، الصفحات..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(s + 1, allResults.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
                if (e.key === "Enter" && allResults[selected]) go(allResults[selected]);
              }}
            />
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted transition">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!query && (
              <p className="py-8 text-center text-sm text-muted-foreground">ابدأ الكتابة للبحث...</p>
            )}

            {query && allResults.length === 0 && !loading && (
              <p className="py-8 text-center text-sm text-muted-foreground">لا توجد نتائج لـ «{query}»</p>
            )}

            {/* Links */}
            {results.links.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-xs font-bold text-muted-foreground">الصفحات</p>
                {results.links.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = selected === idx;
                  return (
                    <button
                      key={item.path}
                      onClick={() => go(item)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${isSelected ? "gradient-primary text-white" : "hover:bg-muted"}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 text-start font-medium">{item.label}</span>
                      <ArrowLeft className="h-3.5 w-3.5 opacity-50" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Crew */}
            {results.crew.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-xs font-bold text-muted-foreground">الموظفون</p>
                {results.crew.map((item, idx) => {
                  const absIdx = results.links.length + idx;
                  const isSelected = selected === absIdx;
                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => go({ path: "/app/crew" })}
                      onMouseEnter={() => setSelected(absIdx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${isSelected ? "gradient-primary text-white" : "hover:bg-muted"}`}
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full gradient-primary text-xs font-bold text-white shrink-0">
                        {item.name?.[0] || "م"}
                      </div>
                      <div className="flex-1 text-start">
                        <p className="font-medium">{item.name}</p>
                        <p className={`text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>{item.job_title || "موظف"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bank */}
            {results.bank.length > 0 && (
              <div>
                <p className="px-3 py-1.5 text-xs font-bold text-muted-foreground">المعاملات المالية</p>
                {results.bank.map((item, idx) => {
                  const absIdx = results.links.length + results.crew.length + idx;
                  const isSelected = selected === absIdx;
                  return (
                    <button
                      key={item.id || idx}
                      onClick={() => go({ path: "/app/bank" })}
                      onMouseEnter={() => setSelected(absIdx)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${isSelected ? "gradient-primary text-white" : "hover:bg-muted"}`}
                    >
                      <Wallet className="h-4 w-4 shrink-0" />
                      <div className="flex-1 text-start">
                        <p className="font-medium">{item.description}</p>
                        <p className={`text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>{item.amount?.toLocaleString()} ج.م</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd> تنقل</span>
            <span className="flex items-center gap-1"><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Enter</kbd> فتح</span>
            <span className="flex items-center gap-1"><kbd className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">Esc</kbd> إغلاق</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
