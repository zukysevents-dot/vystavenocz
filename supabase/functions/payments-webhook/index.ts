import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// GA4 Measurement Protocol — fires server-side `purchase` event so attribution
// works even when the browser closes after checkout. Requires both:
//   GA_MEASUREMENT_ID  (e.g. "G-77KM55J70P")
//   GA_API_SECRET      (created in GA4 Admin → Data Streams → Measurement Protocol API secrets)
// If either is missing, we silently skip — no purchase event reaches GA4.
async function sendGa4Purchase(params: {
  clientId: string;
  transactionId: string;
  value: number;
  currency: string;
  itemId?: string;
  userId?: string;
  attribution?: Record<string, string>;
}) {
  const measurementId = Deno.env.get("GA_MEASUREMENT_ID") || "G-77KM55J70P";
  const apiSecret = Deno.env.get("GA_API_SECRET");
  if (!measurementId || !apiSecret) {
    console.log("GA4 MP skipped (missing GA_MEASUREMENT_ID or GA_API_SECRET)");
    return;
  }
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  const body = {
    client_id: params.clientId,
    ...(params.userId && { user_id: params.userId }),
    events: [
      {
        name: "purchase",
        params: {
          transaction_id: params.transactionId,
          value: params.value,
          currency: params.currency,
          ...(params.attribution ?? {}),
          items: [
            {
              item_id: params.itemId ?? "subscription",
              item_name: "Vystaveno předplatné",
              price: params.value,
              quantity: 1,
            },
          ],
        },
      },
    ],
  };
  try {
    const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) console.error("GA4 MP error:", res.status, await res.text());
    else console.log("GA4 purchase sent:", params.transactionId);
  } catch (e) {
    console.error("GA4 MP fetch failed:", e);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Stripe event:", event.type, "env:", env);

    switch (event.type) {
      // Předplatné vytvořeno (po úspěšné platbě v checkoutu)
      case "customer.subscription.created":
      // Změna stavu (renew, upgrade, cancel_at_period_end, past_due → active …)
      case "customer.subscription.updated":
        await upsertSubscription(event.data.object, env);
        break;

      // Definitivní zrušení (po vypršení období nebo okamžité)
      case "customer.subscription.deleted":
        await markCanceled(event.data.object, env);
        break;

      // Úspěšná platba (renewal) — prodlužuje aktivní přístup
      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object, env);
        break;

      // Neúspěšná platba — Stripe bude zkoušet znovu, ale přístup pozastavíme,
      // jakmile subscription přejde do past_due/unpaid (řeší subscription.updated).
      // Tady jen logujeme pro audit.
      case "invoice.payment_failed":
        console.warn(
          "Invoice payment failed:",
          event.data.object.id,
          "subscription:",
          event.data.object.subscription,
        );
        await handleInvoiceFailed(event.data.object, env);
        break;

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;

  // Stripe API 2025+ moves period fields onto the subscription item
  const periodStart = subscription.current_period_start ?? item?.current_period_start;
  const periodEnd = subscription.current_period_end ?? item?.current_period_end;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  // Mirror na profil pro rychlé kontroly v UI/RLS bez dotazu na subscriptions
  // Aktivní = active nebo trialing. past_due / unpaid / incomplete / canceled = neaktivní.
  const active = ["active", "trialing"].includes(subscription.status);
  await supabase
    .from("profiles")
    .update({
      subscription_active: active,
      subscription_until: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", userId);
}

// Renewal úspěšně zaplacen → najdi subscription a obnov její stav.
// Stripe pošle vzápětí i customer.subscription.updated, ale pro jistotu
// promítáme i tady (idempotentní upsert).
async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return; // jednorázová platba, ne subscription

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id, current_period_end")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();

  if (!sub?.user_id) {
    console.warn("invoice.payment_succeeded: subscription not found", subscriptionId);
    return;
  }

  // Pokud invoice obsahuje period_end, použijeme jej (rychlejší než čekat na subscription.updated)
  const line = invoice.lines?.data?.[0];
  const periodEnd = line?.period?.end;
  const updates: Record<string, unknown> = {
    status: "active",
    updated_at: new Date().toISOString(),
  };
  if (periodEnd) {
    updates.current_period_end = new Date(periodEnd * 1000).toISOString();
  }

  await supabase
    .from("subscriptions")
    .update(updates)
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env);

  await supabase
    .from("profiles")
    .update({
      subscription_active: true,
      ...(periodEnd && {
        subscription_until: new Date(periodEnd * 1000).toISOString(),
      }),
    })
    .eq("id", sub.user_id);

  console.log("Subscription renewed:", subscriptionId, "user:", sub.user_id);

  // Fire GA4 purchase event only on the FIRST invoice (billing_reason = subscription_create).
  // Renewals are not tracked as conversions to avoid inflating campaign data.
  if (invoice.billing_reason === "subscription_create") {
    try {
      // Pull metadata (ga_client_id, utm_*) from the subscription set in create-checkout.
      const { createStripeClient } = await import("../_shared/stripe.ts");
      const stripe = createStripeClient(env);
      const subFull = await stripe.subscriptions.retrieve(subscriptionId);
      const meta = (subFull.metadata ?? {}) as Record<string, string>;
      const clientId = meta.ga_client_id;
      if (clientId) {
        const attribution: Record<string, string> = {};
        for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"]) {
          if (meta[k]) attribution[k] = meta[k];
        }
        await sendGa4Purchase({
          clientId,
          transactionId: invoice.id,
          value: (invoice.amount_paid ?? 0) / 100,
          currency: (invoice.currency ?? "czk").toUpperCase(),
          itemId: subFull.items?.data?.[0]?.price?.metadata?.lovable_external_id
            ?? subFull.items?.data?.[0]?.price?.id,
          userId: sub.user_id,
          attribution,
        });
      } else {
        console.log("GA4 purchase skipped: no ga_client_id in subscription metadata");
      }
    } catch (e) {
      console.error("GA4 purchase event failed (non-fatal):", e);
    }
  }
}

// Neúspěšná platba — Stripe sám pošle subscription.updated s novým status
// (past_due / unpaid). Pro audit logujeme + okamžitě deaktivujeme přístup
// na profilu, aby uživatel ihned viděl, že je něco špatně.
async function handleInvoiceFailed(invoice: any, env: StripeEnv) {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();

  if (!sub?.user_id) return;

  // Pozastav přístup okamžitě. Po úspěšné retry platbě se přes
  // invoice.payment_succeeded / subscription.updated vrátí na true.
  await supabase
    .from("profiles")
    .update({ subscription_active: false })
    .eq("id", sub.user_id);

  console.warn(
    "Subscription access suspended (payment failed):",
    subscriptionId,
    "user:",
    sub.user_id,
  );
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  const userId = subscription.metadata?.userId;
  if (userId) {
    await supabase
      .from("profiles")
      .update({ subscription_active: false })
      .eq("id", userId);
  }
}