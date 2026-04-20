import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;
const environment: "sandbox" | "live" = clientToken?.startsWith("pk_test_")
  ? "sandbox"
  : "live";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    if (!clientToken) {
      throw new Error("VITE_PAYMENTS_CLIENT_TOKEN není nastaven");
    }
    stripePromise = loadStripe(clientToken);
  }
  return stripePromise;
}

export function getStripeEnvironment(): "sandbox" | "live" {
  return environment;
}

export function isTestMode(): boolean {
  return environment === "sandbox";
}

export async function openCustomerPortal(returnUrl?: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {
    body: {
      environment,
      returnUrl: returnUrl || `${window.location.origin}/app/predplatne`,
    },
  });
  if (error || !data?.url) {
    throw new Error(error?.message || "Nepodařilo se otevřít správu předplatného");
  }
  window.open(data.url, "_blank", "noopener,noreferrer");
}