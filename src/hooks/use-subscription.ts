import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getStripeEnvironment } from "@/lib/stripe";

export type SubscriptionRow = {
  id: string;
  status: string;
  price_id: string;
  product_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
};

export type AccessState = {
  loading: boolean;
  hasAccess: boolean; // trial OR paid
  isPaid: boolean;
  isTrial: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
  subscription: SubscriptionRow | null;
  refresh: () => Promise<void>;
};

export function useSubscription(): AccessState {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);

  const env = getStripeEnvironment();

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: subs }, { data: profile }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, price_id, product_id, current_period_end, cancel_at_period_end, stripe_customer_id")
        .eq("user_id", user.id)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.from("profiles").select("trial_ends_at").eq("id", user.id).maybeSingle(),
    ]);

    setSubscription((subs?.[0] as SubscriptionRow | undefined) ?? null);
    setTrialEndsAt(profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null);
    setLoading(false);
  }, [user, env]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`sub-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const now = Date.now();
  const isTrial = trialEndsAt ? trialEndsAt.getTime() > now : false;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24)))
    : null;

  const isPaid = (() => {
    if (!subscription) return false;
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end).getTime()
      : Infinity;
    if (["active", "trialing"].includes(subscription.status) && periodEnd > now) return true;
    if (subscription.status === "canceled" && periodEnd > now) return true;
    return false;
  })();

  return {
    loading,
    hasAccess: isPaid || isTrial,
    isPaid,
    isTrial: isTrial && !isPaid,
    trialEndsAt,
    trialDaysLeft,
    subscription,
    refresh: load,
  };
}