import { Link } from "@tanstack/react-router";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";

export function TrialBanner() {
  const { loading, isPaid, isTrial, trialDaysLeft } = useSubscription();

  if (loading || isPaid) return null;

  // Expired trial — block-style banner
  if (!isTrial) {
    return (
      <div className="flex items-center justify-between gap-3 border-b border-coral/30 bg-coral/10 px-4 py-2 text-sm">
        <div className="flex items-center gap-2 text-coral">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-medium">
            Zkušební doba skončila — pro vystavování faktur aktivujte předplatné.
          </span>
        </div>
        <Link
          to="/app/predplatne"
          className="rounded-full bg-coral px-3 py-1 text-xs font-semibold text-coral-foreground hover:opacity-90"
        >
          Aktivovat
        </Link>
      </div>
    );
  }

  // Active trial — show only if ≤ 7 days
  if (trialDaysLeft === null || trialDaysLeft > 7) return null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-mint/30 bg-mint/10 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 text-foreground">
        <Sparkles className="h-4 w-4 text-mint-foreground" />
        <span>
          Zkušební doba: zbývá <strong>{trialDaysLeft}</strong>{" "}
          {trialDaysLeft === 1 ? "den" : trialDaysLeft < 5 ? "dny" : "dní"}
        </span>
      </div>
      <Link
        to="/app/predplatne"
        className="text-xs font-semibold text-primary hover:underline"
      >
        Aktivovat za 100 Kč/měs →
      </Link>
    </div>
  );
}