/**
 * Server funkce pro GDPR — export dat, anonymizace účtu, výpis audit logu.
 * Všechny operace běží pod autentizovaným uživatelem (RLS / SECURITY DEFINER).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Stáhne všechna data uživatele jako JSON + CSV + odkazy ke stažení PDF.
 * Vrací base64-enkódovaná PDF, aby se daly v prohlížeči zabalit do ZIPu.
 */
export const exportUserData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: clients }, { data: invoices }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("clients").select("*").eq("user_id", userId).order("created_at", { ascending: true }),
      supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false }),
    ]);

    const json = JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        profile: profile ?? null,
        clients: clients ?? [],
        invoices: invoices ?? [],
      },
      null,
      2,
    );

    const csvClients = toCsv(
      clients ?? [],
      ["id", "name", "email", "phone", "ico", "dic", "street", "city", "zip", "country", "created_at"],
    );

    const csvInvoices = toCsv(
      (invoices ?? []).map((inv) => ({
        ...inv,
        client_name: (inv.client_snapshot as Record<string, unknown>)?.name ?? "",
      })),
      [
        "invoice_number",
        "document_type",
        "status",
        "client_name",
        "issue_date",
        "due_date",
        "taxable_date",
        "currency",
        "subtotal",
        "vat_total",
        "total",
        "variable_symbol",
        "paid_at",
      ],
    );

    // PDF soubory ze Storage — nahrazuje signed URL přímo bytes (klient je zazipuje).
    const pdfFiles: Array<{ name: string; base64: string }> = [];
    for (const inv of invoices ?? []) {
      const path = `${userId}/${inv.id}.pdf`;
      const { data: blob, error } = await supabase.storage.from("invoices").download(path);
      if (error || !blob) continue;
      const buf = await blob.arrayBuffer();
      pdfFiles.push({
        name: `${sanitizeFilename(inv.invoice_number)}.pdf`,
        base64: arrayBufferToBase64(buf),
      });
    }

    // Audit log
    await supabase.rpc("log_audit_event", {
      _event_type: "data.exported",
      _description: `Uživatel si stáhl všechna svoje data (${invoices?.length ?? 0} faktur, ${clients?.length ?? 0} klientů).`,
      _ip_address: getClientIp(),
      _metadata: {},
    });

    return {
      json,
      csvClients,
      csvInvoices,
      pdfFiles,
      counts: {
        clients: clients?.length ?? 0,
        invoices: invoices?.length ?? 0,
        pdfs: pdfFiles.length,
      },
    };
  });

/**
 * Anonymizuje účet — smaže klienty, vyprázdní citlivá pole na profilu,
 * faktury ponechá kvůli zákonu o účetnictví.
 */
export const anonymizeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirmation: string }) => {
    if (input?.confirmation !== "ANONYMIZOVAT") {
      throw new Error("Nesprávné potvrzení. Napište přesně ANONYMIZOVAT.");
    }
    return input;
  })
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Smazání PDF ze storage (klienti i tak jsou pryč, faktury anonymizujeme)
    const { data: files } = await supabase.storage.from("invoices").list(userId, { limit: 1000 });
    if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("invoices").remove(paths);
    }
    const { data: logoFiles } = await supabase.storage.from("logos").list(userId, { limit: 100 });
    if (logoFiles && logoFiles.length > 0) {
      const paths = logoFiles.map((f) => `${userId}/${f.name}`);
      await supabase.storage.from("logos").remove(paths);
    }

    const { error } = await supabase.rpc("anonymize_account", { _user_id: userId });
    if (error) {
      throw new Error(`Anonymizace selhala: ${error.message}`);
    }

    // Po anonymizaci uživatele odhlásíme na klientovi (volá se po návratu)
    return { ok: true };
  });

/**
 * Vrátí posledních 100 audit eventů přihlášeného uživatele.
 */
export const listAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, event_type, description, ip_address, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { logs: data ?? [] };
  });

// ---------- helpers ----------

function getClientIp(): string | undefined {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
    undefined
  );
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return "";
        const s = typeof v === "string" ? v : JSON.stringify(v);
        // CSV escaping (Excel-friendly, UTF-8 BOM se přidá v UI)
        if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      })
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function sanitizeFilename(s: string): string {
  return (s || "faktura").replace(/[^\w\-.]+/g, "_");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Worker-safe base64 (chunky aby nedošlo k stack overflow)
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  // btoa je v Workeru dostupné
  return btoa(binary);
}