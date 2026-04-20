// AI asistent pro fakturaci — využívá Lovable AI Gateway
// Podporuje streaming (SSE) i tool calling pro přímou aplikaci změn na fakturu.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Jsi AI asistent pro českou fakturační aplikaci Fakturio. Pomáháš živnostníkům a malým firmám s fakturami.

UMÍŠ:
- Navrhovat a generovat položky faktur (popis, množství, jednotka, cena, sazba DPH)
- Upravit existující položky (přidat/změnit/smazat)
- Měnit datum splatnosti, poznámky, variabilní symbol
- Vysvětlit DPH sazby v ČR (21 %, 12 %, 0 %), DUZP, IBAN, QR platby SPAYD
- Pomoci s formulací popisu služeb, poznámek, e-mailových textů

STYL:
- Vždy česky, přátelsky a stručně
- Zkracuj — žádné dlouhé úvody
- Když uživatel požádá o změnu faktury, **POUŽIJ TOOL** \`apply_invoice_changes\` místo psaní JSON v textu
- Po použití toolu krátce shrň, co jsi udělal/a (1–2 věty)
- Ceny vždy v Kč bez DPH; DPH spočítá aplikace sama
- Pokud uživatel není plátce DPH, používej sazbu 0`;

const tools = [
  {
    type: "function",
    function: {
      name: "apply_invoice_changes",
      description:
        "Aplikuje změny na rozpracovanou fakturu. Použij vždy, když uživatel chce přidat/upravit/smazat položky nebo změnit pole faktury (splatnost, poznámka, VS, způsob úhrady).",
      parameters: {
        type: "object",
        properties: {
          replace_items: {
            type: "boolean",
            description:
              "true = nahradí všechny položky novými z `items`; false (výchozí) = připojí položky z `items` k existujícím.",
          },
          items: {
            type: "array",
            description: "Položky faktury k přidání nebo nahrazení.",
            items: {
              type: "object",
              properties: {
                description: { type: "string", description: "Popis položky (např. 'Vývoj webu - 8 hodin')" },
                quantity: { type: "number", description: "Množství" },
                unit: { type: "string", description: "Jednotka: 'hod', 'ks', 'měsíc', 'den', 'km'…" },
                unit_price: { type: "number", description: "Cena za jednotku v Kč BEZ DPH" },
                vat_rate: { type: "number", enum: [0, 12, 21], description: "Sazba DPH v %" },
              },
              required: ["description", "quantity", "unit", "unit_price", "vat_rate"],
              additionalProperties: false,
            },
          },
          due_date: { type: "string", description: "Datum splatnosti ve formátu YYYY-MM-DD" },
          notes: { type: "string", description: "Poznámka pro klienta na faktuře" },
          variable_symbol: { type: "string", description: "Variabilní symbol (jen číslice)" },
          payment_method: {
            type: "string",
            enum: ["bank_transfer", "cash", "card"],
            description: "Způsob úhrady",
          },
        },
        additionalProperties: false,
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, invoice_context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY není nakonfigurován");

    const contextBlock = invoice_context
      ? `\n\nAKTUÁLNÍ STAV FAKTURY:\n${JSON.stringify(invoice_context, null, 2)}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextBlock },
          ...messages,
        ],
        tools,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Příliš mnoho požadavků, zkuste to prosím za chvíli." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI kredit vyčerpán. Doplňte prosím kredit ve workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Chyba AI brány" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("invoice-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Neznámá chyba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
