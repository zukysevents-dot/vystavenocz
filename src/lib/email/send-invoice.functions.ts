import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import QRCode from "qrcode";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildSpayd, czAccountToIban, formatCZK, formatDate } from "@/lib/invoice";
import { renderInvoiceEmailHtml } from "@/lib/email/invoice-email-template";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 dní

const inputSchema = z.object({
  invoiceId: z.string().uuid(),
  pdfPath: z.string().min(1).max(512),
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")),
  subject: z.string().min(1).max(300),
  personalNote: z.string().max(2000).optional().or(z.literal("")),
  filename: z.string().min(1).max(200),
});

export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 0) Server-side paywall check — uživatel musí mít aktivní trial nebo placené předplatné
    const stripeEnv =
      (process.env.VITE_STRIPE_ENVIRONMENT as string | undefined) === "live"
        ? "live"
        : "sandbox";
    const { data: hasAccess, error: accessErr } = await supabase.rpc("has_paid_access", {
      user_uuid: userId,
      check_env: stripeEnv,
    });
    if (accessErr) {
      throw new Error("Nepodařilo se ověřit předplatné: " + accessErr.message);
    }
    if (!hasAccess) {
      throw new Error("Pro odesílání faktur e-mailem je potřeba aktivní předplatné.");
    }

    // 1) Načti fakturu se všemi potřebnými daty
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, user_id, total, currency, due_date, issue_date, variable_symbol, client_snapshot, supplier_snapshot",
      )
      .eq("id", data.invoiceId)
      .single();

    if (invErr || !invoice) {
      throw new Error("Faktura nenalezena.");
    }

    // 2) Bezpečnostní check: PDF cesta musí začínat user_id
    if (!data.pdfPath.startsWith(`${userId}/`)) {
      throw new Error("Neplatná cesta k PDF.");
    }

    // 3) Stáhni PDF (bucket je privátní)
    const { data: fileBlob, error: dlErr } = await supabaseAdmin.storage
      .from("invoices")
      .download(data.pdfPath);

    if (dlErr || !fileBlob) {
      throw new Error("Nepodařilo se načíst PDF: " + (dlErr?.message ?? "neznámá chyba"));
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

    // 4) Vytvoř signed URL pro veřejné zobrazení/stažení faktury (30 dní)
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("invoices")
      .createSignedUrl(data.pdfPath, SIGNED_URL_TTL_SECONDS, {
        download: `${invoice.invoice_number}.pdf`,
      });

    const invoiceUrl = signErr ? null : signed?.signedUrl ?? null;

    // 5) Profil odesílatele
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "company_name, full_name, email, invoice_color, invoice_sender_local_part, logo_url, bank_account, iban, swift",
      )
      .eq("id", userId)
      .single();

    const fromName =
      profile?.company_name?.trim() || profile?.full_name?.trim() || "Vystaveno";

    // 6) Sestav QR platbu (SPAYD → PNG dataURL → cid attachment)
    const supplierSnap =
      (invoice.supplier_snapshot as Record<string, unknown>) ?? {};
    const iban =
      (typeof supplierSnap.iban === "string" && supplierSnap.iban) ||
      profile?.iban ||
      (profile?.bank_account ? czAccountToIban(profile.bank_account) : null) ||
      (typeof supplierSnap.bank_account === "string"
        ? czAccountToIban(supplierSnap.bank_account)
        : null);

    let qrCid: string | null = null;
    let qrAttachment: { filename: string; content: string; content_id: string } | null = null;

    if (iban && Number(invoice.total) > 0) {
      const spayd = buildSpayd({
        iban,
        amount: Number(invoice.total),
        currency: invoice.currency || "CZK",
        variableSymbol: invoice.variable_symbol || undefined,
        message: `Faktura ${invoice.invoice_number}`,
        swift: profile?.swift || (typeof supplierSnap.swift === "string" ? supplierSnap.swift : null),
      });
      try {
        const qrDataUrl = await QRCode.toDataURL(spayd, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 320,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        const base64 = qrDataUrl.split(",")[1];
        qrCid = "qr-platba.png";
        qrAttachment = {
          filename: "qr-platba.png",
          content: base64,
          content_id: qrCid,
        };
      } catch (e) {
        console.warn("QR kód se nepodařilo vygenerovat:", e);
      }
    }

    // 7) Vyrenderuj HTML šablonu
    const clientSnap = (invoice.client_snapshot as Record<string, unknown>) ?? {};
    const clientName = typeof clientSnap.name === "string" ? clientSnap.name : null;

    const html = renderInvoiceEmailHtml({
      brandColor: profile?.invoice_color || "#0fbfb6",
      logoUrl: profile?.logo_url || null,
      supplierName: fromName,
      clientName,
      invoiceNumber: invoice.invoice_number,
      issueDate: formatDate(invoice.issue_date),
      dueDate: formatDate(invoice.due_date),
      total: formatCZK(Number(invoice.total), invoice.currency || "CZK"),
      variableSymbol: invoice.variable_symbol,
      personalNote: data.personalNote?.trim() || null,
      invoiceUrl,
      qrCid,
      replyToEmail: profile?.email || null,
    });

    // 8) Sestav text fallback
    const text = buildPlainText({
      clientName,
      invoiceNumber: invoice.invoice_number,
      total: formatCZK(Number(invoice.total), invoice.currency || "CZK"),
      dueDate: formatDate(invoice.due_date),
      variableSymbol: invoice.variable_symbol,
      personalNote: data.personalNote?.trim() || null,
      supplierName: fromName,
      invoiceUrl,
    });

    // 9) Pošli přes Resend
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY není nakonfigurován.");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY není nakonfigurován.");

    const localPartRaw = profile?.invoice_sender_local_part?.trim().toLowerCase() || "faktury";
    const localPart = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(localPartRaw)
      ? localPartRaw
      : "faktury";
    const fromAddress = `${fromName} <${localPart}@vystaveno.cz>`;

    const attachments: Array<Record<string, unknown>> = [
      { filename: data.filename, content: pdfBase64 },
    ];
    if (qrAttachment) {
      attachments.push({
        filename: qrAttachment.filename,
        content: qrAttachment.content,
        content_id: qrAttachment.content_id,
      });
    }

    const body: Record<string, unknown> = {
      from: fromAddress,
      to: [data.to],
      subject: data.subject,
      text,
      html,
      attachments,
    };
    if (profile?.email) body.reply_to = profile.email;
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

    return { ok: true, id: (result as { id?: string }).id };
  });

function buildPlainText(opts: {
  clientName: string | null;
  invoiceNumber: string;
  total: string;
  dueDate: string;
  variableSymbol: string | null;
  personalNote: string | null;
  supplierName: string;
  invoiceUrl: string | null;
}): string {
  const greeting = opts.clientName ? `Dobrý den, ${opts.clientName},` : "Dobrý den,";
  const note = opts.personalNote ? `\n${opts.personalNote}\n` : "";
  const link = opts.invoiceUrl ? `\n\nZobrazit fakturu online:\n${opts.invoiceUrl}` : "";
  const vs = opts.variableSymbol ? `\nVariabilní symbol: ${opts.variableSymbol}` : "";
  return `${greeting}
${note}
v příloze najdete fakturu č. ${opts.invoiceNumber}.

Částka k úhradě: ${opts.total}
Splatnost: ${opts.dueDate}${vs}${link}

S pozdravem
${opts.supplierName}`;
}
