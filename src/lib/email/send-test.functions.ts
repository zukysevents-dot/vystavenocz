import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const LOCAL_PART_REGEX = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

export const sendTestInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("company_name, full_name, email, invoice_color, invoice_sender_local_part")
      .eq("id", userId)
      .single();

    if (profErr || !profile) {
      throw new Error("Nepodařilo se načíst profil.");
    }
    if (!profile.email) {
      throw new Error("Ve vašem profilu chybí e-mail.");
    }

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY není nakonfigurován.");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY není nakonfigurován.");

    const fromName =
      profile.company_name?.trim() || profile.full_name?.trim() || "Vystaveno";
    const localPartRaw = profile.invoice_sender_local_part?.trim().toLowerCase() || "faktury";
    const localPart = LOCAL_PART_REGEX.test(localPartRaw) ? localPartRaw : "faktury";
    const fromAddress = `${fromName} <${localPart}@vystaveno.cz>`;
    const brand = /^#[0-9a-fA-F]{6}$/.test(profile.invoice_color || "") ? profile.invoice_color! : "#0fbfb6";
    const now = new Date().toLocaleString("cs-CZ", { dateStyle: "long", timeStyle: "short" });

    const html = `<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Testovací e-mail</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">
        <tr><td style="background:${brand};padding:24px 32px;">
          <div style="font-size:12px;color:rgba(255,255,255,0.85);font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Vystaveno.cz</div>
          <div style="font-size:20px;color:#ffffff;font-weight:700;margin-top:4px;">✓ Testovací e-mail dorazil</div>
        </td></tr>
        <tr><td style="padding:28px 32px 8px 32px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;">Skvěle, doručitelnost funguje!</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
            Tento e-mail byl odeslán z adresy <strong style="color:#0f172a;font-family:ui-monospace,monospace;">${localPart}@vystaveno.cz</strong>
            a dorazil do vaší schránky <strong style="color:#0f172a;">${escapeHtml(profile.email)}</strong>.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#475569;">
            Pokud čtete tuto zprávu, znamená to, že DNS záznamy (SPF, DKIM, DMARC) jsou v pořádku
            a faktury vašim klientům budou doručené spolehlivě, bez bounce a bez spam složky.
          </p>
        </td></tr>
        <tr><td style="padding:8px 32px 24px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;font-size:14px;">
            <tr><td style="padding:14px 18px;color:#64748b;width:45%;">Odesílatel</td><td style="padding:14px 18px;color:#0f172a;text-align:right;font-family:ui-monospace,monospace;">${localPart}@vystaveno.cz</td></tr>
            <tr><td style="padding:14px 18px;color:#64748b;border-top:1px solid #e2e8f0;">Odpověď přijde na</td><td style="padding:14px 18px;color:#0f172a;text-align:right;border-top:1px solid #e2e8f0;font-family:ui-monospace,monospace;">${escapeHtml(profile.email)}</td></tr>
            <tr><td style="padding:14px 18px;color:#64748b;border-top:1px solid #e2e8f0;">Čas odeslání</td><td style="padding:14px 18px;color:#0f172a;text-align:right;border-top:1px solid #e2e8f0;">${escapeHtml(now)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Vytvořeno ve <a href="https://vystaveno.cz" style="color:${brand};text-decoration:none;font-weight:500;">Vystaveno.cz</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const text = `✓ Testovací e-mail dorazil

Skvěle, doručitelnost funguje!

Tento e-mail byl odeslán z adresy ${localPart}@vystaveno.cz a dorazil do schránky ${profile.email}.

Pokud čtete tuto zprávu, DNS záznamy (SPF, DKIM, DMARC) jsou v pořádku a faktury vašim klientům budou doručené spolehlivě.

Čas odeslání: ${now}

— Vystaveno.cz`;

    const res = await fetch(`${RESEND_GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [profile.email],
        reply_to: profile.email,
        subject: `✓ Testovací e-mail z ${localPart}@vystaveno.cz`,
        html,
        text,
      }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (result as { message?: string }).message || res.statusText;
      throw new Error(`Odeslání selhalo [${res.status}]: ${msg}`);
    }

    return { ok: true, to: profile.email, from: fromAddress, id: (result as { id?: string }).id };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
