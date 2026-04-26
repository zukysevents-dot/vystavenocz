// ARES (Administrativní registr ekonomických subjektů) lookup
// Veřejná data o českých firmách podle IČO
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ico = (url.searchParams.get("ico") || "").replace(/\s/g, "");

    if (!/^\d{6,8}$/.test(ico)) {
      return new Response(
        JSON.stringify({ error: "Neplatné IČO. Zadejte 6–8 číslic." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paddedIco = ico.padStart(8, "0");
    const aresUrl = `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${paddedIco}`;

    const aresRes = await fetch(aresUrl, {
      headers: { Accept: "application/json" },
    });

    if (aresRes.status === 404) {
      return new Response(
        JSON.stringify({ error: "Firma s tímto IČO nebyla nalezena." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aresRes.ok) {
      const text = await aresRes.text();
      console.error("ARES error:", aresRes.status, text);
      return new Response(
        JSON.stringify({ error: "Chyba při komunikaci s ARES." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aresRes.json();
    const sidlo = data?.sidlo ?? {};

    const result: {
      ico: string;
      dic: string | null;
      company_name: string | null;
      legal_form: string | null;
      street: string | null;
      city: string | null;
      zip: string | null;
      country: string;
    } = {
      ico: data?.ico ?? paddedIco,
      dic: data?.dic ?? null,
      company_name: data?.obchodniJmeno ?? null,
      legal_form: data?.pravniForma ?? null,
      street:
        [sidlo?.nazevUlice, sidlo?.cisloDomovni].filter(Boolean).join(" ") +
        (sidlo?.cisloOrientacni ? `/${sidlo.cisloOrientacni}` : ""),
      city: sidlo?.nazevObce ?? null,
      zip: sidlo?.psc ? String(sidlo.psc) : null,
      country: sidlo?.kodStatu === "CZ" || !sidlo?.kodStatu ? "CZ" : sidlo?.kodStatu,
    };

    // Trim empty street
    if (!result.street?.trim()) result.street = null;

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ares-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Neznámá chyba" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
