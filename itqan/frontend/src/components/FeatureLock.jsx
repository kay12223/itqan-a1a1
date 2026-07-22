import { Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader, GlassCard, PrimaryButton } from "@/components/Kit";

const CONTACT = "01012930571";

/**
 * Shared "feature requires subscription" gate — same look everywhere (matches شات الفريق).
 * Renders the locked card in place of real content until the company actually owns the feature
 * (active subscription, permanent add-on purchase, or an active bundle).
 */
export default function FeatureLock({ pageTitle, pageSubtitle, icon: Icon, title, description, perks = [] }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} subtitle={pageSubtitle} icon={Icon} />
      <GlassCard className="flex flex-col items-center py-16 text-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className="font-display text-2xl font-black">{title}</p>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          <PrimaryButton onClick={() => navigate("/app/subscriptions")} className="gap-2">
            <Crown className="h-4 w-4" /> ترقية الاشتراك
          </PrimaryButton>
          <a
            href={`https://wa.me/2${CONTACT}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-2xl border border-border px-5 py-2.5 text-sm font-bold hover:bg-muted/60 transition"
          >
            تواصل معنا
          </a>
        </div>
        {perks.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-3 mt-2 text-right w-full max-w-lg">
            {perks.map((f) => (
              <div key={f} className="flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                {f}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
