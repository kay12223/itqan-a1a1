import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Clock, Wallet, Boxes, BrainCircuit, KeyRound,
  Building2, Settings, LogOut, Menu, X, CheckCircle2, CalendarDays, User, Crown,
  Bot, MessagesSquare, NotebookPen, Megaphone, CalendarClock, ListTodo, Activity,
  Palette, Search, FileText, UserCog, Landmark, Table2, TrendingUp,
  Vault, BookOpen, Shield, BarChart3, Fingerprint, MapPin,
  Timer, FileCheck, Globe, CalendarRange as CalendarRange2, BookMarked,
  ShieldCheck, ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEditMode } from "@/context/EditModeContext";
import { useLanguage } from "@/context/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VoidParticles from "@/components/VoidParticles";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import StorageBar from "@/components/StorageBar";
import GlobalSearch from "@/components/GlobalSearch";
import SystemBanner from "@/components/SystemBanner";
import Calculator from "@/components/Calculator";

/* ── Color map for nav icon boxes ── */
const iconColors = {
  "/app/dashboard":        "from-blue-500 to-cyan-500",
  "/app/crew":             "from-violet-500 to-purple-500",
  "/app/managers":         "from-indigo-500 to-blue-500",
  "/app/attendance":       "from-emerald-500 to-teal-500",
  "/app/qr-display":       "from-cyan-500 to-sky-500",
  "/app/leaves":           "from-rose-500 to-pink-500",
  "/app/late-permissions": "from-amber-500 to-yellow-500",
  "/app/loans":            "from-lime-500 to-green-500",
  "/app/finance":          "from-emerald-600 to-green-500",
  "/app/bank":             "from-teal-500 to-cyan-500",
  "/app/petty-cash":       "from-orange-500 to-amber-500",
  "/app/manager-records":  "from-slate-500 to-gray-500",
  "/app/company-stats":    "from-violet-500 to-indigo-500",
  "/app/spreadsheet":      "from-sky-500 to-blue-500",
  "/app/performance":      "from-blue-500 to-indigo-500",
  "/app/operations":       "from-orange-500 to-red-500",
  "/app/worklog":          "from-yellow-500 to-amber-500",
  "/app/announcements":    "from-pink-500 to-rose-500",
  "/app/live-monitor":     "from-red-500 to-rose-500",
  "/app/ai-monitor":       "from-indigo-500 to-violet-500",
  "/app/security":         "from-slate-600 to-slate-500",
  "/app/device-tracking":  "from-rose-600 to-red-500",
  "/app/branches":         "from-teal-500 to-emerald-500",
  "/app/temp-access":      "from-amber-500 to-orange-500",
  "/app/invoices":         "from-emerald-600 to-green-500",
  "/app/client-portal":    "from-sky-500 to-blue-500",
  "/app/shifts":           "from-cyan-500 to-teal-500",
  "/app/learning":         "from-sky-600 to-indigo-500",
  "/app/compliance":       "from-green-600 to-emerald-500",
  "/app/assistant":        "from-violet-600 to-purple-500",
  "/app/chat":             "from-cyan-500 to-blue-500",
  "/app/todo":             "from-amber-500 to-orange-500",
  "/app/activity-log":     "from-gray-500 to-slate-500",
  "/app/design-studio":    "from-fuchsia-500 to-pink-500",
  "/app/subscriptions":    "from-yellow-500 to-amber-500",
  "/app/company":          "from-blue-600 to-blue-500",
  "/app/settings":         "from-slate-500 to-gray-400",
  "/app/me":               "from-blue-500 to-cyan-500",
  "/app/my-work":          "from-amber-500 to-yellow-500",
  "/app/my-attendance":    "from-emerald-500 to-teal-500",
  "/app/qr-scan":          "from-cyan-500 to-sky-500",
  "/app/my-loans":         "from-lime-500 to-green-500",
  "/app/profile":          "from-violet-500 to-purple-500",
};

/* labelKey maps to t("nav.<key>") */
const managerLinks = [
  { to: "/app/dashboard",        icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { to: "/app/crew",             icon: Users,           labelKey: "nav.crew",            module: "crew" },
  { to: "/app/branches",         icon: MapPin,          labelKey: "nav.branches",        module: "crew" },
  { to: "/app/temp-access",      icon: Timer,           labelKey: "nav.temp_access",     module: "temp_access" },
  { to: "/app/invoices",         icon: FileCheck,       labelKey: "nav.invoices",        module: "finance" },
  { to: "/app/client-portal",    icon: Globe,           labelKey: "nav.client_portal" },
  { to: "/app/shifts",           icon: CalendarRange2,  labelKey: "nav.shifts",          module: "crew" },
  { to: "/app/learning",         icon: BookMarked,      labelKey: "nav.learning" },
  { to: "/app/compliance",       icon: ShieldCheck,     labelKey: "nav.compliance",      module: "reports" },
  { to: "/app/managers",         icon: UserCog,         labelKey: "nav.managers" },
  { to: "/app/attendance",       icon: Fingerprint,     labelKey: "nav.attendance",      module: "crew" },
  { to: "/app/qr-display",       icon: KeyRound,        labelKey: "nav.qr_display",      module: "crew" },
  { to: "/app/leaves",           icon: CalendarClock,   labelKey: "nav.leaves",          module: "crew" },
  { to: "/app/late-permissions", icon: Clock,           labelKey: "nav.late_permissions",module: "crew" },
  { to: "/app/loans",            icon: Landmark,        labelKey: "nav.loans",           module: "finance" },
  { to: "/app/finance",          icon: Wallet,          labelKey: "nav.finance",         module: "finance" },
  { to: "/app/bank",             icon: Building2,       labelKey: "nav.bank",            module: "finance" },
  { to: "/app/petty-cash",       icon: Vault,           labelKey: "nav.petty_cash",      module: "finance" },
  { to: "/app/manager-records",  icon: BookOpen,        labelKey: "nav.manager_records" },
  { to: "/app/company-stats",    icon: BarChart3,       labelKey: "nav.company_stats",   module: "reports" },
  { to: "/app/spreadsheet",      icon: Table2,          labelKey: "nav.spreadsheet",     module: "reports" },
  { to: "/app/performance",      icon: TrendingUp,      labelKey: "nav.performance",     module: "reports" },
  { to: "/app/operations",       icon: Boxes,           labelKey: "nav.operations",      module: "tasks" },
  { to: "/app/worklog",          icon: NotebookPen,     labelKey: "nav.worklog",         module: "tasks" },
  { to: "/app/announcements",    icon: Megaphone,       labelKey: "nav.announcements" },
  { to: "/app/live-monitor",     icon: Activity,        labelKey: "nav.live_monitor",    module: "device_tracking" },
  { to: "/app/ai-monitor",       icon: BrainCircuit,    labelKey: "nav.ai_monitor" },
  { to: "/app/security",         icon: Shield,          labelKey: "nav.security",        module: "settings" },
  { to: "/app/device-tracking",  icon: ShieldAlert,     labelKey: "nav.device_tracking", module: "device_tracking" },
  { to: "/app/assistant",        icon: Bot,             labelKey: "nav.assistant",       module: "ai_assistant" },
  { to: "/app/chat",             icon: MessagesSquare,  labelKey: "nav.chat" },
  { to: "/app/todo",             icon: ListTodo,        labelKey: "nav.todo" },
  { to: "/app/activity-log",     icon: FileText,        labelKey: "nav.activity_log",    module: "reports" },
  { to: "/app/design-studio",    icon: Palette,         labelKey: "nav.design_studio" },
  { to: "/app/subscriptions",    icon: Crown,           labelKey: "nav.subscriptions" },
  { to: "/app/company",          icon: Building2,       labelKey: "nav.company",         module: "settings" },
  { to: "/app/settings",         icon: Settings,        labelKey: "nav.settings",        module: "settings" },
];

const employeeLinks = [
  { to: "/app/me",            icon: CheckCircle2,  labelKey: "nav.my_dashboard" },
  { to: "/app/my-work",       icon: NotebookPen,   labelKey: "nav.my_work" },
  { to: "/app/my-attendance", icon: CalendarDays,  labelKey: "nav.my_attendance" },
  { to: "/app/qr-scan",       icon: KeyRound,      labelKey: "nav.qr_scan" },
  { to: "/app/my-loans",      icon: Landmark,      labelKey: "nav.my_loans" },
  { to: "/app/leaves",        icon: CalendarClock, labelKey: "nav.leaves" },
  { to: "/app/announcements", icon: Megaphone,     labelKey: "nav.announcements" },
  { to: "/app/assistant",     icon: Bot,           labelKey: "nav.assistant" },
  { to: "/app/chat",          icon: MessagesSquare,labelKey: "nav.chat" },
  { to: "/app/todo",          icon: ListTodo,      labelKey: "nav.todo" },
  { to: "/app/profile",       icon: User,          labelKey: "nav.profile" },
];

export default function AppLayout() {
  const { user, company, logout } = useAuth();
  // eslint-disable-next-line no-unused-vars
  const { openPrompt } = useEditMode();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(window.innerWidth >= 1024);
  const [searchOpen, setSearchOpen] = useState(false);
  const logoClicksRef = useRef(0);
  const logoTimerRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth < 1024) setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const STORAGE_KEY = "itqan_design_settings";
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (s.bgImage) {
        let bgEl = document.getElementById("itqan-bg-overlay");
        if (!bgEl) {
          bgEl = document.createElement("div");
          bgEl.id = "itqan-bg-overlay";
          bgEl.style.cssText = "position:fixed;inset:0;z-index:-2;pointer-events:none;transition:opacity 0.4s;";
          document.body.prepend(bgEl);
        }
        bgEl.style.backgroundImage    = `url(${s.bgImage})`;
        bgEl.style.backgroundSize     = s.bgSize     || "cover";
        bgEl.style.backgroundPosition = s.bgPosition || "center";
        bgEl.style.backgroundRepeat   = s.bgRepeat   || "no-repeat";
        bgEl.style.opacity            = (s.bgOpacity ?? 40) / 100;
      }
    } catch {}
    return () => {
      const bgEl = document.getElementById("itqan-bg-overlay");
      if (bgEl) bgEl.style.backgroundImage = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogoClick = () => {
    logoClicksRef.current += 1;
    clearTimeout(logoTimerRef.current);
    logoTimerRef.current = setTimeout(() => { logoClicksRef.current = 0; }, 2000);
    if (logoClicksRef.current >= 5) { logoClicksRef.current = 0; openPrompt(); }
  };

  const allowedModules = user?.allowed_modules;
  const links = (user?.role === "manager" ? managerLinks : employeeLinks)
    .filter((l) => !l.module || !allowedModules || allowedModules.includes(l.module));
  const isPremium = company?.is_premium;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isRTL = lang === "ar";

  return (
    <div className="relative min-h-screen">
      <VoidParticles />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <SystemBanner />

      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border px-4 py-3 glass">
        <div className="flex items-center gap-3">
          <button
            data-testid="sidebar-toggle"
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl glass card-hover"
            aria-label={t("sidebar.menu")}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Logo size="text-xl" onClick={handleLogoClick} />
          {isPremium && (() => {
            const fx = company?.plan_effects;
            const style = fx
              ? { background: `linear-gradient(135deg, ${fx.color}, ${fx.glow})`, boxShadow: `0 0 12px ${fx.glow}` }
              : undefined;
            return (
              <span
                className="hidden items-center gap-1 rounded-full px-3 py-1 text-xs font-bold text-white sm:flex"
                style={style || {}}
                data-testid="premium-badge"
              >
                <Crown className="h-3.5 w-3.5" />
                {fx?.badge || "PREMIUM"}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2 rounded-xl border border-border glass px-3 py-2 text-sm text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground sm:flex"
          >
            <Search className="h-4 w-4" />
            <span>{t("common.search_placeholder")}</span>
            <kbd className="ms-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</kbd>
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl glass card-hover sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>
          <div className={`hidden text-${isRTL ? "right" : "left"} sm:block`}>
            <p className="text-sm font-bold leading-tight">{user?.name}</p>
            <p className="text-xs text-muted-foreground">
              {user?.role === "manager" ? t("sidebar.manager_role") : user?.job_title || t("sidebar.employee_role")}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full gradient-primary text-white">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-bold">{user?.name?.[0] || "؟"}</span>
            )}
          </div>
          <LanguageSwitcher compact />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {open && (
            <>
              <motion.aside
                initial={{ x: isRTL ? 40 : -40, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: isRTL ? 40 : -40, opacity: 0 }}
                transition={{ duration: 0.25 }}
                data-testid="sidebar"
                className="fixed bottom-0 right-0 top-[65px] z-30 flex w-72 flex-col gap-2 overflow-y-auto border-s border-border p-4 glass lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)]"
              >
                <div className="rounded-2xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">{t("sidebar.company")}</p>
                  <p className="truncate font-display font-bold">{company?.name}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl bg-muted/60 p-2">
                      <p className="text-lg font-black gradient-text">{company?.crew_count ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{t("sidebar.employees_count")}</p>
                    </div>
                    <div className="rounded-xl bg-muted/60 p-2">
                      <p className="text-lg font-black gradient-text">{company?.account_limit ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">{t("sidebar.account_limit")}</p>
                    </div>
                  </div>
                </div>

                <nav className="mt-2 flex flex-col gap-1">
                  {links.map((l) => {
                    const grad = iconColors[l.to] || "from-blue-500 to-violet-500";
                    return (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        data-testid={`nav-${l.to.split("/").pop()}`}
                        className={({ isActive }) =>
                          `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isActive
                              ? "bg-gradient-to-l from-violet-600/20 to-blue-600/20 border border-violet-500/25 text-white"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} shadow-sm`}>
                              <l.icon className="h-4 w-4 text-white" />
                            </span>
                            <span className="truncate">{t(l.labelKey)}</span>
                            {isActive && (
                              <span className="ms-auto h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>

                <div className="mt-auto space-y-3 pt-3">
                  <div className="rounded-2xl border border-border p-3">
                    <StorageBar used={company?.storage_used_mb || 0} limit={company?.storage_limit_mb || 100} compact />
                  </div>
                  <button
                    onClick={handleLogout}
                    data-testid="logout-button"
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/40 px-3 py-2.5 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" /> {t("sidebar.logout")}
                  </button>
                </div>
              </motion.aside>
              {window.innerWidth < 1024 && (
                <div className="fixed inset-0 top-[65px] z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
              )}
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <Calculator />
    </div>
  );
}
