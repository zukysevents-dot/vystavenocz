import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";

const inputSchema = z.object({
  invoiceId: z.string().uuid(),
  pdfPath: z.string().min(1).max(512),
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")),
  subject: z.string().min(1).max(300),
  message: z.string().min(1).max(5000),
  filename: z.string().min(1).max(200),
});

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ověř že faktura patří uživateli
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("id, invoice_number, user_id")
      .eq("id", data.invoiceId)
      .single();

    if (invErr || !invoice) {
      throw new Error("Faktura nenalezena.");
    }

    // Ověř že PDF cesta začíná na user_id (RLS-like check)
    if (!data.pdfPath.startsWith(`${userId}/`)) {
      throw new Error("Neplatná cesta k PDF.");
    }

    // Stáhni PDF přes service role (bucket je privátní)
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from("invoices")
      .download(data.pdfPath);

    if (dlErr || !fileBlob) {
      throw new Error("Nepodařilo se načíst PDF: " + (dlErr?.message ?? "neznámá chyba"));
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Profil odesílatele pro from name
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name, full_name, email, invoice_sender_local_part")
      .eq("id", userId)
      .single();

    const fromName =
      profile?.company_name?.trim() ||
      profile?.full_name?.trim() ||
      "Vystaveno";

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY není nakonfigurován.");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY není nakonfigurován.");

    // Sestav odesílatele z profilu uživatele. Doména musí být ověřena v Resendu.
    const localPartRaw = profile?.invoice_sender_local_part?.trim().toLowerCase() || "faktury";
    const localPart = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(localPartRaw)
      ? localPartRaw
      : "faktury";
    const fromAddress = `${fromName} <${localPart}@vystaveno.cz>`;

    const replyTo = profile?.email || undefined;

    const body: Record<string, unknown> = {
      from: fromAddress,
      to: [data.to],
      subject: data.subject,
      text: data.message,
      html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; white-space: pre-wrap; line-height: 1.6; color: #1a1a1a;">${escapeHtml(data.message)}</div>`,
      attachments: [
        {
          filename: data.filename,
          content: base64,
        },
      ],
    };
    if (replyTo) body.reply_to = replyTo;
    if (data.cc && data.cc.length > 0) body.cc = [data.cc];

    const res = await fetch(`${RESEND_GATEWAY}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (result as { message?: string }).message || res.statusText;
      throw new Error(`Odeslání selhalo [${res.status}]: ${msg}`);
    }

    // Pokud je faktura draft, zkus ji vystavit
    if (invoice) {
      await supabase
        .from("invoices")
        .update({ status: "issued" })
        .eq("id", data.invoiceId)
        .eq("status", "draft");
    }

    return { ok: true, id: (result as { id?: string }).id };
  });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}