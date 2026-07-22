import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import VoidParticles from "@/components/VoidParticles";
import Logo from "@/components/Logo";

/**
 * The system is dedicated to photography / video production / ad agencies —
 * there is no business-type selection step. New companies go straight to the dashboard.
 */
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    navigate("/app/dashboard", { replace: true });
  }, [user, navigate]);

  return (
    <div className="relative min-h-screen overflow-y-auto p-4 pb-20">
      <VoidParticles />
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center justify-center pt-24 text-center">
        <div className="mb-8"><Logo size="text-2xl" /></div>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}
