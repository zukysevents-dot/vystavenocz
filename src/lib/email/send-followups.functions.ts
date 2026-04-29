/**
 * Server functions pro odeslání UPOMÍNKY a PODĚKOVÁNÍ za platbu.
 *
 * Sdílí infrastrukturu se `send-invoice.functions.ts` (Resend gateway,
 * Supabase admin storage pro PDF a signed URL, paywall check, profil).
 * Jediný rozdíl je render šablony a předmět e-mailu.
 *
 * Upomínka i poděkování NEsdílejí sloupec ve `invoices` tabulce — log
 * odeslaných upomínek se zatím neukládá. Když uživatel později zapne
 * automat, přidáme `last_reminder_sent_at` + `reminders_sent_count`.
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import QRCode from "qrcode";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildSpayd, czAccountToIban, formatCZK, formatDate } from "@/lib/invoice";
import {
  renderReminderEmailHtml,
  renderThankYouEmailHtml,
  buildReminderPlainText,
  buildThankYouPlainText,
  type ReminderLevel,
} from "@/lib/email/templates";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 30;

async function logEmail(args: {
  invoiceId: string;
  userId: string;
  kind: "reminder" | "thank_you";
  level?: number | null;
  recipient: string;
  cc?: string | null;
  subject: string;
  resendId?: string | null;
  status: "sent" | "failed";
  errorMessage?: string | null;
}) {
  try {
    await supabaseAdmin.from("email_send_log").insert({
      invoice_id: args.invoiceId,
      user_id: args.userId,
      kind: args.kind,
      level: args.level ?? null,
      recipient: args.recipient,
      cc: args.cc ?? null,
      subject: args.subject,
      resend_id: args.resendId ?? null,
      status: args.status,
      error_message: args.errorMessage ?? null,
    });
  } catch (e) {
    console.warn("Nepodařilo se zalogovat e-mail:", e);
  }
}

// ───────────────────────── společné typy a helpery ─────────────────────────

type LoadedContext = {
  invoice: {
    id: string;
    invoice_number: string;
    user_id: string;
    total: number | string;
    currency: string | null;
    due_date: string;
    issue_date: string;
    variable_symbol: string | null;
    client_snapshot: Record<string, unknown> | null;
    supplier_snapshot: Record<string, unknown> | null;
    paid_at?: string | null;
  };
  profile: {
    company_name: string | null;
    full_name: string | null;
    email: string;
    invoice_color: string | null;
    invoice_sender_local_part: string | null;
    logo_url: string | null;
    bank_account: string | null;
    iban: string | null;
    swift: string | null;
  } | null;
  fromName: string;
  fromAddress: string;
  invoiceUrl: string | null;
  qrCid: string | null;
  qrAttachment: { filename: string; content: string; content_id: string } | null;
};

async function loadContextForFollowup(args: {
  supabase: SupabaseClient;
  userId: string;
  invoiceId: string;
  needsQR: boolean;
}): Promise<LoadedContext> {
  const { supabase, userId, invoiceId, needsQR } = args;

  // Paywall — sandbox nebo live musí mít přístup
  const [{ data: liveAccess }, { data: sandboxAccess }] = await Promise.all([
    supabase.rpc("has_paid_access", { user_uuid: userId, check_env: "live" }),
    supabase.rpc("has_paid_access", { user_uuid: userId, check_env: "sandbox" }),
  ]);
  if (!liveAccess && !sandboxAccess) {
    throw new Error("Pro odesílání e-mailů je potřeba aktivní předplatné.");
  }

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, user_id, total, currency, due_date, issue_date, variable_symbol, client_snapshot, supplier_snapshot, paid_at",
    )
    .eq("id", invoiceId)
    .single();
  if (invErr || !invoice) throw new Error("Faktura nenalezena.");

  // Najdi PDF v Storage — pokud existuje, vytvoř signed URL pro CTA tlačítko.
  // Pokud PDF neexistuje (uživatel ještě fakturu neodeslal e-mailem), CTA se
  // prostě nezobrazí — upomínka pořád dává smysl, jen bez odkazu.
  const pdfPath = `${userId}/${invoice.id}.pdf`;
  let invoiceUrl: string | null = null;
  try {
    const { data: signed } = await supabaseAdmin.storage
      .from("invoices")
      .createSignedUrl(pdfPath, SIGNED_URL_TTL_SECONDS, {
        download: `${invoice.invoice_number}.pdf`,
      });
    invoiceUrl = signed?.signedUrl ?? null;
  } catch {
    invoiceUrl = null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "company_name, full_name, email, invoice_color, invoice_sender_local_part, logo_url, bank_account, iban, swift",
    )
    .eq("id", userId)
    .single();

  const fromName =
    profile?.company_name?.trim() || profile?.full_name?.trim() || "Vystaveno";

  const localPartRaw = profile?.invoice_sender_local_part?.trim().toLowerCase() || "faktury";
  const localPart = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/.test(localPartRaw)
    ? localPartRaw
    : "faktury";
  const fromAddress = `${fromName} <${localPart}@vystaveno.cz>`;

  // QR kód jen u upomínek (poděkování QR nepotřebuje).
  let qrCid: string | null = null;
  let qrAttachment: LoadedContext["qrAttachment"] = null;
  if (needsQR) {
    const supplierSnap = (invoice.supplier_snapshot as Record<string, unknown>) ?? {};
    const iban =
      (typeof supplierSnap.iban === "string" && supplierSnap.iban) ||
      profile?.iban ||
      (profile?.bank_account ? czAccountToIban(profile.bank_account) : null) ||
      (typeof supplierSnap.bank_account === "string"
        ? czAccountToIban(supplierSnap.bank_account)
        : null);

    if (iban && Number(invoice.total) > 0) {
      const spayd = buildSpayd({
        iban,
        amount: Number(invoice.total),
        currency: invoice.currency || "CZK",
        variableSymbol: invoice.variable_symbol || undefined,
        message: `Faktura ${invoice.invoice_number}`,
        swift:
          profile?.swift ||
          (typeof supplierSnap.swift === "string" ? supplierSnap.swift : null),
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
        qrAttachment = { filename: "qr-platba.png", content: base64, content_id: qrCid };
      } catch (e) {
        console.warn("QR kód se nepodařilo vygenerovat:", e);
      }
    }
  }

  return {
    invoice: invoice as LoadedContext["invoice"],
    profile: profile as LoadedContext["profile"],
    fromName,
    fromAddress,
    invoiceUrl,
    qrCid,
    qrAttachment,
  };
}

async function sendViaResend(opts: {
  fromAddress: string;
  to: string;
  cc?: string;
  replyTo?: string | null;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<Record<string, unknown>>;
}): Promise<{ id?: string }> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY není nakonfigurován.");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY není nakonfigurován.");

  const body: Record<string, unknown> = {
    from: opts.fromAddress,
    to: [opts.to],
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };
  if (opts.attachments?.length) body.attachments = opts.attachments;
  if (opts.replyTo) body.reply_to = opts.replyTo;
  if (opts.cc && opts.cc.length > 0) body.cc = [opts.cc];

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
  return result as { id?: string };
}

// ───────────────────────── REMINDER ─────────────────────────

const reminderInputSchema = z.object({
  invoiceId: z.string().uuid(),
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")),
  subject: z.string().min(1).max(300),
  personalNote: z.string().max(2000).optional().or(z.literal("")),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const sendInvoiceReminder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reminderInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContextForFollowup({
      supabase,
      userId,
      invoiceId: data.invoiceId,
      needsQR: true,
    });

    // Spočítej dny po splatnosti (min 1)
    const due = new Date(ctx.invoice.due_date);
    const today = new Date();
    const daysOverdue = Math.max(
      1,
      Math.floor((today.getTime() - due.getTime()) / 86400000),
    );

    const clientSnap = (ctx.invoice.client_snapshot as Record<string, unknown>) ?? {};
    const clientName = typeof clientSnap.name === "string" ? clientSnap.name : null;

    const sharedData = {
      brandColor: ctx.profile?.invoice_color || "#0fbfb6",
      logoUrl: ctx.profile?.logo_url || null,
      supplierName: ctx.fromName,
      clientName,
      invoiceNumber: ctx.invoice.invoice_number,
      issueDate: formatDate(ctx.invoice.issue_date),
      dueDate: formatDate(ctx.invoice.due_date),
      total: formatCZK(Number(ctx.invoice.total), ctx.invoice.currency || "CZK"),
      variableSymbol: ctx.invoice.variable_symbol,
      personalNote: data.personalNote?.trim() || null,
      invoiceUrl: ctx.invoiceUrl,
      qrCid: ctx.qrCid,
      replyToEmail: ctx.profile?.email || null,
      level: data.level as ReminderLevel,
      daysOverdue,
    };

    const html = renderReminderEmailHtml(sharedData);
    const text = buildReminderPlainText(sharedData);

    const attachments = ctx.qrAttachment
      ? [
          {
            filename: ctx.qrAttachment.filename,
            content: ctx.qrAttachment.content,
            content_id: ctx.qrAttachment.content_id,
          },
        ]
      : undefined;

    try {
      const result = await sendViaResend({
        fromAddress: ctx.fromAddress,
        to: data.to,
        cc: data.cc || undefined,
        replyTo: ctx.profile?.email || null,
        subject: data.subject,
        text,
        html,
        attachments,
      });
      await logEmail({
        invoiceId: data.invoiceId,
        userId,
        kind: "reminder",
        level: data.level,
        recipient: data.to,
        cc: data.cc || null,
        subject: data.subject,
        resendId: result.id || null,
        status: "sent",
      });
      return { ok: true, id: result.id };
    } catch (err) {
      await logEmail({
        invoiceId: data.invoiceId,
        userId,
        kind: "reminder",
        level: data.level,
        recipient: data.to,
        cc: data.cc || null,
        subject: data.subject,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });

// ───────────────────────── THANK YOU ─────────────────────────

const thankYouInputSchema = z.object({
  invoiceId: z.string().uuid(),
  to: z.string().email(),
  cc: z.string().email().optional().or(z.literal("")),
  subject: z.string().min(1).max(300),
  personalNote: z.string().max(2000).optional().or(z.literal("")),
  /** ISO datum přijetí platby; default = dnes. */
  paidOn: z.string().min(1).optional(),
});

export const sendInvoiceThankYou = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => thankYouInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await loadContextForFollowup({
      supabase,
      userId,
      invoiceId: data.invoiceId,
      needsQR: false,
    });

    const clientSnap = (ctx.invoice.client_snapshot as Record<string, unknown>) ?? {};
    const clientName = typeof clientSnap.name === "string" ? clientSnap.name : null;

    const paidOnIso =
      data.paidOn || ctx.invoice.paid_at || new Date().toISOString().slice(0, 10);

    const sharedData = {
      brandColor: ctx.profile?.invoice_color || "#0fbfb6",
      logoUrl: ctx.profile?.logo_url || null,
      supplierName: ctx.fromName,
      clientName,
      invoiceNumber: ctx.invoice.invoice_number,
      issueDate: formatDate(ctx.invoice.issue_date),
      dueDate: formatDate(ctx.invoice.due_date),
      total: formatCZK(Number(ctx.invoice.total), ctx.invoice.currency || "CZK"),
      variableSymbol: ctx.invoice.variable_symbol,
      personalNote: data.personalNote?.trim() || null,
      invoiceUrl: ctx.invoiceUrl,
      qrCid: null,
      replyToEmail: ctx.profile?.email || null,
      paidOn: formatDate(paidOnIso),
    };

    const html = renderThankYouEmailHtml(sharedData);
    const text = buildThankYouPlainText(sharedData);

    try {
      const result = await sendViaResend({
        fromAddress: ctx.fromAddress,
        to: data.to,
        cc: data.cc || undefined,
        replyTo: ctx.profile?.email || null,
        subject: data.subject,
        text,
        html,
      });
      await logEmail({
        invoiceId: data.invoiceId,
        userId,
        kind: "thank_you",
        recipient: data.to,
        cc: data.cc || null,
        subject: data.subject,
        resendId: result.id || null,
        status: "sent",
      });
      return { ok: true, id: result.id };
    } catch (err) {
      await logEmail({
        invoiceId: data.invoiceId,
        userId,
        kind: "thank_you",
        recipient: data.to,
        cc: data.cc || null,
        subject: data.subject,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  });
