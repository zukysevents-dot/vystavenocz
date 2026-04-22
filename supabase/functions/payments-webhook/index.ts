import { createClient } from "npm:@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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

  // Mirror onto profile for fast checks
  const active = ["active", "trialing"].includes(subscription.status);
  await supabase
    .from("profiles")
    .update({
      subscription_active: active,
      subscription_until: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq("id", userId);
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