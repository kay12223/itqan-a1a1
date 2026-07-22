import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, User, Rocket, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import VoidParticles from "@/components/VoidParticles";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Field, PrimaryButton } from "@/components/Kit";

export default function Login() {
  const { login, registerManager } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [role, setRole] = useState("manager");
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ company_name: "", name: "", identifier: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    let res;
    if (role === "manager" && mode === "register") {
      res = await registerManager({
        company_name: form.company_name,
        name: form.name,
        email: form.email,
        password: form.password,
      });
    } else {
      const ident = role === "manager" ? form.email : form.identifier;
      res = await login(ident, form.password, role);
    }
    setLoading(false);
    if (res.ok) {
      if (res.user.role === "manager" && mode === "register") {
        navigate("/onboarding");
      } else {
        navigate(res.user.role === "manager" ? "/app/dashboard" : "/app/me");
      }
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <VoidParticles />
      <div className="absolute right-5 top-5 flex items-center gap-3">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <Link to="/" className="absolute left-5 top-5"><Logo size="text-xl" /></Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[2rem] glass p-8"
      >
        <div className="text-center">
          <h1 className="font-display text-2xl font-black">{t("auth.login")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.subtitle_manager")}</p>
        </div>

        {/* Role selector */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[
            { id: "manager", label: t("auth.manager"), icon: Shield },
            { id: "member",  label: t("auth.employee"), icon: User },
          ].map((r) => (
            <button
              key={r.id}
              data-testid={`role-${r.id}`}
              onClick={() => { setRole(r.id); setMode("login"); setError(""); }}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition ${
                role === r.id ? "gradient-primary border-transparent text-white void-glow" : "border-border glass"
              }`}
            >
              <r.icon className="h-6 w-6" />
              <span className="text-sm font-bold">{r.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {role === "manager" && mode === "register" && (
            <>
              <Field label={t("auth.company_name")} value={form.company_name} onChange={upd("company_name")} required data-testid="input-company" placeholder="شركة الفراغ" />
              <Field label={t("auth.your_name")} value={form.name} onChange={upd("name")} required data-testid="input-name" placeholder="الاسم الكامل" />
            </>
          )}

          {role === "manager" ? (
            <Field label={t("auth.email")} type="email" value={form.email} onChange={upd("email")} required data-testid="input-email" placeholder="admin@itqan.com" />
          ) : (
            <Field label={t("auth.identifier")} value={form.identifier} onChange={upd("identifier")} required data-testid="input-identifier" placeholder="اسم المستخدم الذي أنشأه المدير" />
          )}

          <Field label={t("auth.password")} type="password" value={form.password} onChange={upd("password")} required data-testid="input-password" placeholder="••••••••" />

          {error && (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400" data-testid="login-error">{error}</p>
          )}

          <PrimaryButton type="submit" disabled={loading} className="w-full" data-testid="submit-auth">
            {loading ? t("common.loading") : (
              <>
                {mode === "register" ? <Rocket className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {role === "manager" && mode === "register" ? t("auth.register_btn") : t("auth.login_btn")}
              </>
            )}
          </PrimaryButton>
        </form>

        {role === "manager" && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "login" ? t("auth.no_account") + " " : t("auth.have_account") + " "}
            <button
              data-testid="toggle-mode"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="font-bold gradient-text"
            >
              {mode === "login" ? t("auth.register") : t("auth.login")}
            </button>
          </p>
        )}
        {role === "member" && (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            {t("auth.subtitle_employee")}
          </p>
        )}
      </motion.div>
    </div>
  );
}
