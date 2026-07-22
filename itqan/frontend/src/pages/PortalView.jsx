import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Building2, FileText, AlertTriangle } from "lucide-react";
import api from "@/lib/apiClient";
import VoidParticles from "@/components/VoidParticles";

const STATUS = {
  active:    { label: "قيد التنفيذ",  icon: Clock,        color: "text-blue-400   bg-blue-500/10   border-blue-500/30" },
  completed: { label: "مكتمل",        icon: CheckCircle2, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  pending:   { label: "في الانتظار",  icon: Clock,        color: "text-amber-400  bg-amber-500/10   border-amber-500/30" },
  cancelled: { label: "ملغى",         icon: XCircle,      color: "text-rose-400   bg-rose-500/10    border-rose-500/30" },
};

export default function PortalView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/portal/${token}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.response?.data?.detail || "خطأ في تحميل البوابة"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin-slow rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">جارٍ تحميل البوابة...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <VoidParticles />
      <div className="relative z-10 w-full max-w-md rounded-[2rem] glass p-10 text-center">
        <AlertTriangle className="mx-auto mb-4 h-16 w-16 text-rose-400" />
        <h1 className="font-display text-2xl font-black">بوابة غير متاحة</h1>
        <p className="mt-3 text-muted-foreground">{error}</p>
      </div>
    </div>
  );

  const st = STATUS[data.project_status] || STATUS.active;
  const StIcon = st.icon;
  const expires = new Date(data.expires_at);

  return (
    <div className="relative min-h-screen p-4">
      <VoidParticles />
      <div className="relative z-10 mx-auto max-w-lg pt-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] glass p-8">
          {/* Company header */}
          <div className="mb-6 flex items-center gap-4">
            {data.company_logo ? (
              <img src={data.company_logo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary text-2xl font-black text-white void-glow">
                {data.company_name?.[0] || "ش"}
              </div>
            )}
            <div>
              <p className="font-display text-xl font-black">{data.company_name}</p>
              <p className="text-sm text-muted-foreground">بوابة متابعة المشروع</p>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 p-5">
            <p className="text-xs text-muted-foreground">مرحباً بك</p>
            <h1 className="mt-1 font-display text-2xl font-black">{data.client_name}</h1>
            {data.description && <p className="mt-2 text-sm text-muted-foreground">{data.description}</p>}
          </div>

          {/* Project status */}
          <div className={`mb-4 rounded-2xl border p-5 ${st.color}`}>
            <div className="flex items-center gap-3">
              <StIcon className="h-8 w-8 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-70">حالة المشروع</p>
                <p className="mt-0.5 font-display text-xl font-black">{data.project_name}</p>
                <p className="mt-1 text-sm font-bold">{st.label}</p>
              </div>
            </div>
          </div>

          {/* Note */}
          {data.project_note && (
            <div className="mb-4 rounded-2xl bg-muted/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">ملاحظات الفريق</p>
              </div>
              <p className="text-sm">{data.project_note}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              <span>{data.company_name}</span>
            </div>
            <span>ينتهي {expires.toLocaleDateString("ar-EG")}</span>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground/60">
            هذا الرابط خاص بك ولا يتيح الدخول لأي بيانات داخلية
          </p>
        </motion.div>
      </div>
    </div>
  );
}
