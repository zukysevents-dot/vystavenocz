// AI asistent pro fakturaci — využívá Lovable AI Gateway
// Podporuje streaming (SSE) i tool calling pro přímou aplikaci změn na fakturu.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT_INVOICE = `Jsi AI asistent pro českou fakturační aplikaci Vystaveno. Pomáháš živnostníkům a malým firmám s fakturami.

UMÍŠ:
- Navrhovat a generovat položky faktur (popis, množství, jednotka, cena, sazba DPH)
- Upravit existující položky (přidat/změnit/smazat, replace_items=true úplně přepíše)
- Měnit datum vystavení, splatnosti, DUZP, variabilní symbol, poznámku, způsob úhrady
- Měnit číslo faktury, vybírat odběratele jménem (client_name)
- Měnit BARVU ŠABLONY faktury (template_color, hex např. "#0F62FE") — automaticky se uloží i do profilu
- Vysvětlit DPH sazby v ČR (21 %, 12 %, 0 %), DUZP, IBAN, QR platby SPAYD
- Pomoci s formulací popisu služeb, poznámek, e-mailových textů

STYL:
- Vždy česky, přátelsky a stručně
- Zkracuj — žádné dlouhé úvody
- Když uživatel požádá o změnu faktury, **POUŽIJ TOOL** \`apply_invoice_changes\` místo psaní JSON v textu
- Můžeš jedním voláním toolu změnit více polí naráz
- Po použití toolu krátce shrň, co jsi udělal/a (1–2 věty)
- Ceny vždy v Kč bez DPH; DPH spočítá aplikace sama
- Pokud uživatel není plátce DPH, používej sazbu 0`;

const SYSTEM_PROMPT_GENERAL = `Jsi AI poradce pro českou fakturační aplikaci Vystaveno. Pomáháš živnostníkům a malým firmám s otázkami kolem fakturace, daní a účetnictví v ČR.

UMÍŠ:
- Vysvětlit DPH sazby v ČR (21 %, 12 %, 0 %), kdo je plátce/identifikovaná osoba/neplátce
- Vysvětlit DUZP, datum vystavení, datum splatnosti, lhůty
- IBAN, BIC/SWIFT, QR platba SPAYD, variabilní/konstantní/specifický symbol
- Náležitosti daňového dokladu vs. faktury neplátce DPH
- Reverse charge, OSS, přeshraniční fakturace v rámci EU
- Obecné rady ke vztahu s ČSSZ, FÚ, EET (zrušeno), kontrolní hlášení

STYL:
- Vždy česky, přátelsky a stručně
- Žádné dlouhé úvody — odpověď nejdřív, pak vysvětlení
- Pokud si nejsi jistý/á (zákony se mění), upozorni a doporuč ověřit u účetní
- Nepíšeš JSON ani neměníš data v aplikaci — jsi jen poradce
- Pro konkrétní úpravy faktury uživateli řekni, ať přepne na záložku „Tato faktura"`;

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
          invoice_number: { type: "string", description: "Nové číslo faktury (např. 'FA-2026-0007')" },
          issue_date: { type: "string", description: "Datum vystavení YYYY-MM-DD" },
          taxable_date: { type: "string", description: "DUZP / datum plnění YYYY-MM-DD" },
          due_date: { type: "string", description: "Datum splatnosti ve formátu YYYY-MM-DD" },
          notes: { type: "string", description: "Poznámka pro klienta na faktuře" },
          variable_symbol: { type: "string", description: "Variabilní symbol (jen číslice)" },
          payment_method: {
            type: "string",
            enum: ["bank_transfer", "cash", "card"],
            description: "Způsob úhrady",
          },
          client_name: {
            type: "string",
            description: "Vyber odběratele podle jména (musí existovat v seznamu klientů uživatele).",
          },
          template_color: {
            type: "string",
            description: "Barva šablony faktury jako hex (např. '#0F62FE'). Změna se uloží i do profilu uživatele jako výchozí.",
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
    // --- Auth check: vyžadujeme platný JWT (zabraňuje zneužití AI kreditů) ---
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Server není správně nakonfigurován." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Denní limit dotazů (ochrana před vyčerpáním AI kreditů jedním uživatelem) ---
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const DAILY_LIMIT = 100;
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: usage, error: usageErr } = await adminClient.rpc("increment_ai_usage", {
        _user_id: userData.user.id,
        _daily_limit: DAILY_LIMIT,
      });
      if (usageErr) {
        console.error("increment_ai_usage error:", usageErr);
      } else if (usage && usage[0]?.limit_exceeded) {
        return new Response(
          JSON.stringify({
            error: `Dosáhli jste denního limitu ${DAILY_LIMIT} dotazů na AI asistenta. Zkuste to prosím zítra.`,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const { messages, invoice_context, mode, image_data_url } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY není nakonfigurován");

    const isGeneral = mode === "general" || !invoice_context;
    const systemPrompt = isGeneral ? SYSTEM_PROMPT_GENERAL : SYSTEM_PROMPT_INVOICE;
    const contextBlock = !isGeneral
      ? `\n\nAKTUÁLNÍ STAV FAKTURY:\n${JSON.stringify(invoice_context, null, 2)}`
      : "";

    // Pokud uživatel přiložil obrázek (foto účtenky/objednávky), připojíme ho k poslední user
    // zprávě jako multimodal content. Gemini Vision rozpozná text a navrhne položky přes tool.
    let preparedMessages = messages;
    if (image_data_url && Array.isArray(messages) && messages.length > 0 && !isGeneral) {
      const lastIdx = messages.length - 1;
      const last = messages[lastIdx];
      if (last?.role === "user") {
        const userText = typeof last.content === "string"
          ? last.content
          : "Rozpoznej položky z přiloženého obrázku a navrhni je k přidání na fakturu.";
        const visionInstruction =
          "Na obrázku je foto účtenky, objednávky nebo dokumentu. " +
          "Rozpoznej z něj jednotlivé položky (popis, množství, jednotku, jednotkovou cenu bez DPH, sazbu DPH) " +
          "a NAVRHNI je k přidání na fakturu pomocí toolu `apply_invoice_changes` " +
          "(replace_items=false – připoj k existujícím). Pokud na obrázku nejsou jasné položky, " +
          "stručně popiš co vidíš a zeptej se uživatele.\n\nPoznámka uživatele: " + userText;
        preparedMessages = [
          ...messages.slice(0, lastIdx),
          {
            role: "user",
            content: [
              { type: "text", text: visionInstruction },
              { type: "image_url", image_url: { url: image_data_url } },
            ],
          },
        ];
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt + contextBlock },
          ...preparedMessages,
        ],
        // V obecném režimu žádné tooly — asistent jen radí
        ...(isGeneral ? {} : { tools }),
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
