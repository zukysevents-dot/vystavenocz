import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";
import { openCustomerPortal } from "@/lib/stripe";
import { StripeEmbeddedCheckout } from "@/components/payments/StripeEmbeddedCheckout";
import { PaymentTestModeBanner } from "@/components/payments/PaymentTestModeBanner";

export const Route = createFileRoute("/_app/app/predplatne/")({
  head: () => ({ meta: [{ title: "Předplatné — Vystaveno" }] }),
  component: PredplatnePage,
});

const features = [
  "Neomezený počet faktur",
  "Neomezený počet klientů",
  "QR platba na každé faktuře",
  "AI asistent v češtině",
  "Vlastní logo a barvy",
  "Cizí měny + kurz ČNB",
  "Export do PDF",
  "Česká podpora",
];

function PredplatnePage() {
  const { user } = useAuth();
  const { isPaid, isTrial, trialDaysLeft, subscription, loading } = useSubscription();
  const [yearly, setYearly] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  const priceId = yearly ? "vystaveno_pro_yearly" : "vystaveno_pro_monthly";

  const handlePortal = async () => {
    setOpeningPortal(true);
    try {
      await openCustomerPortal(`${window.location.origin}/app/predplatne`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOpeningPortal(false);
    }
  };

  return (
    <div className="min-h-full">
      <PaymentTestModeBanner />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Zpět do aplikace
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Předplatné</h1>
          <p className="mt-2 text-muted-foreground">
            Spravujte tarif Vystaveno Pro a fakturační údaje.
          </p>
        </div>

        {loading ? (
          <div className="mt-12 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isPaid ? (
          <ActiveSubscriptionCard
            subscription={subscription!}
            onPortal={handlePortal}
            opening={openingPortal}
          />
        ) : (
          <>
            {isTrial && (
              <div className="mt-6 rounded-2xl border border-mint/30 bg-mint/10 p-4 text-sm text-foreground">
                <strong>Bezplatná zkušební doba.</strong> Zbývá vám {trialDaysLeft} dní. Po uplynutí
                bude potřeba aktivní předplatné pro vystavování faktur.
              </div>
            )}

            {!checkoutOpen ? (
              <PricingCard
                yearly={yearly}
                onToggle={setYearly}
                onSubscribe={() => setCheckoutOpen(true)}
              />
            ) : (
              <div className="mt-8">
                <button
                  onClick={() => setCheckoutOpen(false)}
                  className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Změnit tarif
                </button>
                <StripeEmbeddedCheckout
                  priceId={priceId}
                  customerEmail={user?.email}
                  userId={user?.id}
                  returnUrl={`${window.location.origin}/app/predplatne/dekujeme?session_id={CHECKOUT_SESSION_ID}`}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  function PricingCard({
    yearly,
    onToggle,
    onSubscribe,
  }: {
    yearly: boolean;
    onToggle: (v: boolean) => void;
    onSubscribe: () => void;
  }) {
    return (
      <>
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
            <button
              onClick={() => onToggle(false)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                !yearly ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Měsíčně
            </button>
            <button
              onClick={() => onToggle(true)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                yearly ? "bg-foreground text-background" : "text-muted-foreground"
              }`}
            >
              Ročně
              <span className="rounded-full bg-coral px-2 py-0.5 text-[10px] font-bold text-coral-foreground">
                −37 %
              </span>
            </button>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
          <div className="border-b border-border bg-surface-soft px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">Vystaveno Pro</h3>
                <p className="text-sm text-muted-foreground">Vše bez omezení.</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <Sparkles className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="px-8 py-8">
            <div className="flex items-end gap-2">
              <span className="text-6xl font-extrabold tracking-tight text-foreground">
                {yearly ? "100" : "159"}
              </span>
              <div className="pb-2">
                <p className="text-lg font-semibold text-foreground">Kč</p>
                <p className="text-xs text-muted-foreground">měsíčně bez DPH</p>
              </div>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {yearly
                ? "Účtováno ročně 1 200 Kč. Ušetříte 708 Kč."
                : "Účtováno měsíčně. Přechod na roční tarif kdykoliv."}
            </p>

            <Button variant="coral" size="lg" className="mt-6 w-full" onClick={onSubscribe}>
              Aktivovat Vystaveno Pro
            </Button>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15">
                    <Check className="h-3 w-3 text-success" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    );
  }
}

function ActiveSubscriptionCard({
  subscription,
  onPortal,
  opening,
}: {
  subscription: { price_id: string; current_period_end: string | null; cancel_at_period_end: boolean; status: string };
  onPortal: () => void;
  opening: boolean;
}) {
  const isYearly = subscription.price_id?.includes("yearly");
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("cs-CZ")
    : null;

  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-glow">
      <div className="border-b border-border bg-surface-soft px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">Vystaveno Pro</h3>
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">
                Aktivní
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isYearly ? "Roční tarif (100 Kč/měs)" : "Měsíční tarif (159 Kč/měs)"}
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
            <Check className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {periodEnd && (
          <p className="text-sm text-foreground">
            {subscription.cancel_at_period_end ? (
              <>
                Předplatné bude zrušeno <strong>{periodEnd}</strong>. Do té doby máte plný
                přístup.
              </>
            ) : (
              <>
                Další platba: <strong>{periodEnd}</strong>
              </>
            )}
          </p>
        )}

        <Button
          onClick={onPortal}
          disabled={opening}
          variant="outline"
          className="mt-4 w-full sm:w-auto"
        >
          {opening ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ExternalLink className="mr-2 h-4 w-4" />
          )}
          Spravovat předplatné a faktury
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Otevře se zákaznický portál Stripe v nové záložce — můžete změnit kartu, stáhnout
          faktury nebo předplatné zrušit.
        </p>
      </div>
    </div>
  );
}