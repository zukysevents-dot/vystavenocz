import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { type StripeEnv, createStripeClient, corsHeaders } from "../_shared/stripe.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { priceId, customerEmail, userId, returnUrl, environment, gaClientId, attribution } = await req.json();
    if (!priceId || typeof priceId !== "string" || !/^[a-zA-Z0-9_-]+$/.test(priceId)) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = (environment || "sandbox") as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) {
      return new Response(JSON.stringify({ error: "Price not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // Attribution metadata for server-side GA4 purchase event (Measurement Protocol).
    // Stripe metadata values must be strings ≤500 chars, max 50 keys.
    const attributionMeta: Record<string, string> = {};
    if (gaClientId && typeof gaClientId === "string") attributionMeta.ga_client_id = gaClientId.slice(0, 500);
    if (attribution && typeof attribution === "object") {
      for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid"]) {
        const v = (attribution as Record<string, unknown>)[k];
        if (typeof v === "string" && v) attributionMeta[k] = v.slice(0, 500);
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded",
      locale: "cs",
      return_url:
        returnUrl ||
        `${req.headers.get("origin") ?? "https://vystaveno.cz"}/app/predplatne/dekujeme?session_id={CHECKOUT_SESSION_ID}`,
      ...(customerEmail && { customer_email: customerEmail }),
      ...(userId && {
        metadata: { userId, ...attributionMeta },
        ...(isRecurring && { subscription_data: { metadata: { userId, ...attributionMeta } } }),
      }),
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});