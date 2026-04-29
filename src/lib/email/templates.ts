/**
 * Sdílený layout pro všechny transakční e-maily Vystaveno.cz.
 *
 * Jeden vizuální systém (header s brandovou barvou uživatele, karta se
 * souhrnem, CTA, volitelný QR, podpis, brand footer "Vytvořeno ve Vystaveno.cz").
 * Dílčí šablony (faktura, upomínka, potvrzení o platbě) jen mění obsah
 * uvnitř — wrapper, header a footer zůstávají identické.
 *
 * Inline styly + table-based layout = funguje ve všech klientech (Gmail,
 * Outlook, Apple Mail).
 */

const VYSTAVENO_URL = "https://vystaveno.cz";
const VYSTAVENO_SUPPORT_EMAIL = "patrik@vystaveno.cz";

export type EmailKind = "invoice" | "reminder" | "thank-you";

export type ReminderLevel = 1 | 2 | 3;

export type SharedEmailData = {
  /** HEX brandová barva uživatele, fallback coral */
  brandColor: string;
  logoUrl: string | null;
  supplierName: string;
  clientName: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  total: string;
  variableSymbol: string | null;
  personalNote: string | null;
  invoiceUrl: string | null;
  qrCid: string | null;
  replyToEmail: string | null;
};

export type ReminderEmailData = SharedEmailData & {
  level: ReminderLevel;
  /** Počet dní po splatnosti (>0). Pokud null, vypočítá se z dueDateISO. */
  daysOverdue: number;
};

export type ThankYouEmailData = SharedEmailData & {
  /** Datum, kdy přišla platba (formátované cz). */
  paidOn: string;
};

// ───────────────────────────── helpers ─────────────────────────────

const safe = (s: string | null | undefined) =>
  (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const isValidHexColor = (c: string): boolean => /^#[0-9a-fA-F]{6}$/.test(c);

const brandOf = (c: string) => (isValidHexColor(c) ? c : "#0fbfb6");

function rowKV(key: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;width:50%;">${key}</td>
    <td style="padding:6px 0;color:#0f172a;text-align:right;">${value}</td>
  </tr>`;
}

function noteBlock(brand: string, note: string | null): string {
  if (!note) return "";
  return `<tr><td style="padding:0 32px 24px 32px;">
      <div style="background:#f8fafc;border-left:3px solid ${brand};padding:14px 18px;border-radius:6px;color:#475569;font-size:15px;line-height:1.6;white-space:pre-wrap;">${safe(note)}</div>
    </td></tr>`;
}

function ctaBlock(brand: string, url: string | null, label: string): string {
  if (!url) return "";
  return `<tr><td align="center" style="padding:0 32px 28px 32px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="border-radius:8px;background:${brand};">
          <a href="${safe(url)}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${safe(label)} →</a>
        </td></tr>
      </table>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Odkaz je platný 30 dní</p>
    </td></tr>`;
}

function qrBlock(cid: string | null): string {
  if (!cid) return "";
  return `<tr><td align="center" style="padding:8px 32px 28px 32px;">
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#ffffff;display:inline-block;">
        <div style="font-size:13px;font-weight:600;color:#475569;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.04em;">QR platba</div>
        <img src="cid:${safe(cid)}" alt="QR kód pro platbu" width="180" height="180" style="display:block;width:180px;height:180px;border:0;outline:none;" />
        <div style="font-size:12px;color:#64748b;margin:12px 0 0;max-width:180px;">Naskenujte ve své bankovní aplikaci</div>
      </div>
    </td></tr>`;
}

function logoOrName(d: SharedEmailData): string {
  return d.logoUrl
    ? `<img src="${safe(d.logoUrl)}" alt="${safe(d.supplierName)}" height="40" style="display:block;max-height:40px;width:auto;border:0;outline:none;" />`
    : `<div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${safe(d.supplierName)}</div>`;
}

function shell(opts: {
  brand: string;
  preview: string;
  headerLabel: string;
  invoiceNumber: string;
  logo: string;
  body: string;
}): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${safe(opts.headerLabel)} ${safe(opts.invoiceNumber)}</title>
<style>
  @media only screen and (max-width:600px) {
    .email-container { width:100% !important; }
    .px-mobile { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f1f5f9;">${safe(opts.preview)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

        <!-- Header s brandem -->
        <tr><td style="background:${opts.brand};padding:28px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;">${opts.logo}</td>
              <td align="right" style="vertical-align:middle;">
                <div style="font-size:12px;color:rgba(255,255,255,0.85);font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">${safe(opts.headerLabel)}</div>
                <div style="font-size:18px;color:#ffffff;font-weight:700;margin-top:2px;">${safe(opts.invoiceNumber)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        ${opts.body}

        <!-- Brand footer -->
        <tr><td style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Vytvořeno ve <a href="${VYSTAVENO_URL}" style="color:${opts.brand};text-decoration:none;font-weight:500;">Vystaveno.cz</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function summaryCard(d: SharedEmailData, brand: string, amountLabel = "Částka k úhradě"): string {
  const vsRow = d.variableSymbol ? rowKV("Variabilní symbol", safe(d.variableSymbol)) : "";
  return `<tr><td class="px-mobile" style="padding:8px 32px 12px 32px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">${safe(amountLabel)}</div>
        <div style="font-size:30px;font-weight:700;color:${brand};letter-spacing:-0.02em;">${safe(d.total)}</div>
      </td></tr>
      <tr><td style="padding:18px 22px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;">
          ${rowKV("Datum vystavení", safe(d.issueDate))}
          ${rowKV("Splatnost", `<strong style="color:#0f172a;">${safe(d.dueDate)}</strong>`)}
          ${vsRow}
        </table>
      </td></tr>
    </table>
  </td></tr>`;
}

function signatureBlock(d: SharedEmailData, brand: string, closingPhrase = "S pozdravem"): string {
  const replyHtml = d.replyToEmail
    ? ` na <a href="mailto:${safe(d.replyToEmail)}" style="color:${brand};text-decoration:none;font-weight:500;">${safe(d.replyToEmail)}</a>`
    : "";
  return `<tr><td class="px-mobile" style="padding:0 32px 28px 32px;">
    <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.6;">V případě dotazů mě neváhejte kontaktovat${replyHtml}.</p>
    <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${safe(closingPhrase)},<br/><strong style="color:#0f172a;">${safe(d.supplierName)}</strong></p>
  </td></tr>`;
}

// ───────────────────────────── invoice ─────────────────────────────

export function renderInvoiceEmailHtml(d: SharedEmailData): string {
  const brand = brandOf(d.brandColor);
  const greeting = d.clientName ? `Dobrý den, ${safe(d.clientName)},` : "Dobrý den,";

  const body = `
    <tr><td class="px-mobile" style="padding:32px 32px 12px 32px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${greeting}</h1>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">v příloze Vám zasílám fakturu č. <strong style="color:#0f172a;">${safe(d.invoiceNumber)}</strong>. Souhrn naleznete níže.</p>
    </td></tr>
    ${noteBlock(brand, d.personalNote)}
    ${summaryCard(d, brand)}
    ${ctaBlock(brand, d.invoiceUrl, "Zobrazit fakturu online")}
    ${qrBlock(d.qrCid)}
    ${signatureBlock(d, brand)}
  `;

  return shell({
    brand,
    preview: `Faktura ${d.invoiceNumber} • ${d.total} • splatnost ${d.dueDate}`,
    headerLabel: "Faktura",
    invoiceNumber: d.invoiceNumber,
    logo: logoOrName(d),
    body,
  });
}

// ───────────────────────────── reminder ─────────────────────────────

const REMINDER_INTRO: Record<ReminderLevel, (n: string, days: number) => string> = {
  1: (n, days) =>
    `dovoluji si Vás upozornit, že faktura č. <strong style="color:#0f172a;">${safe(n)}</strong> je <strong>${days} ${pluralDays(days)} po splatnosti</strong>. Pokud již proběhla platba, prosím tento e-mail ignorujte. Děkuji.`,
  2: (n, days) =>
    `předchozí upomínka k faktuře č. <strong style="color:#0f172a;">${safe(n)}</strong> zůstala bez odezvy. Faktura je nyní již <strong>${days} ${pluralDays(days)} po splatnosti</strong>. Prosím o její neodkladnou úhradu.`,
  3: (n, days) =>
    `toto je <strong>poslední upomínka</strong> k úhradě faktury č. <strong style="color:#0f172a;">${safe(n)}</strong>, která je <strong>${days} ${pluralDays(days)} po splatnosti</strong>. Pokud nedojde k úhradě v nejbližších dnech, budu nucen/a přistoupit k vymáhání pohledávky.`,
};

const REMINDER_HEADER: Record<ReminderLevel, string> = {
  1: "Upomínka",
  2: "2. upomínka",
  3: "Poslední upomínka",
};

const REMINDER_TITLE: Record<ReminderLevel, string> = {
  1: "Připomínáme nezaplacenou fakturu",
  2: "Stále evidujeme neuhrazenou fakturu",
  3: "Poslední upomínka před vymáháním",
};

function pluralDays(n: number): string {
  if (n === 1) return "den";
  if (n >= 2 && n <= 4) return "dny";
  return "dní";
}

export function renderReminderEmailHtml(d: ReminderEmailData): string {
  const brand = brandOf(d.brandColor);
  const greeting = d.clientName ? `Dobrý den, ${safe(d.clientName)},` : "Dobrý den,";
  const intro = REMINDER_INTRO[d.level](d.invoiceNumber, d.daysOverdue);

  const body = `
    <tr><td class="px-mobile" style="padding:32px 32px 12px 32px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${safe(REMINDER_TITLE[d.level])}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#475569;">${greeting}</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">${intro}</p>
    </td></tr>
    ${noteBlock(brand, d.personalNote)}
    ${summaryCard(d, brand, "Dlužná částka")}
    ${ctaBlock(brand, d.invoiceUrl, "Zobrazit fakturu a platební údaje")}
    ${qrBlock(d.qrCid)}
    ${signatureBlock(d, brand, "Děkuji za pochopení a s pozdravem")}
  `;

  return shell({
    brand,
    preview: `${REMINDER_HEADER[d.level]} k faktuře ${d.invoiceNumber} • ${d.total}`,
    headerLabel: REMINDER_HEADER[d.level],
    invoiceNumber: d.invoiceNumber,
    logo: logoOrName(d),
    body,
  });
}

// ───────────────────────────── thank-you ─────────────────────────────

export function renderThankYouEmailHtml(d: ThankYouEmailData): string {
  const brand = brandOf(d.brandColor);
  const greeting = d.clientName ? `Dobrý den, ${safe(d.clientName)},` : "Dobrý den,";

  // Poděkování — nemá CTA na placení a nemá QR (faktura už je zaplacená).
  const paidCard = `<tr><td class="px-mobile" style="padding:8px 32px 12px 32px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <tr><td style="padding:20px 22px;background:#ecfdf5;border-bottom:1px solid #d1fae5;">
        <div style="font-size:12px;font-weight:600;color:#047857;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">Uhrazeno</div>
        <div style="font-size:30px;font-weight:700;color:#047857;letter-spacing:-0.02em;">${safe(d.total)}</div>
      </td></tr>
      <tr><td style="padding:18px 22px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;">
          ${rowKV("Faktura", safe(d.invoiceNumber))}
          ${rowKV("Datum platby", `<strong style="color:#0f172a;">${safe(d.paidOn)}</strong>`)}
        </table>
      </td></tr>
    </table>
  </td></tr>`;

  const body = `
    <tr><td class="px-mobile" style="padding:32px 32px 12px 32px;">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">Děkuji za platbu! 🎉</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#475569;">${greeting}</p>
      <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">platba faktury č. <strong style="color:#0f172a;">${safe(d.invoiceNumber)}</strong> byla úspěšně přijata. Velmi si Vaší promptní úhrady vážím.</p>
    </td></tr>
    ${noteBlock(brand, d.personalNote)}
    ${paidCard}
    ${ctaBlock(brand, d.invoiceUrl, "Stáhnout fakturu jako doklad o platbě")}
    ${signatureBlock(d, brand, "S díky a přáním pěkného dne")}
  `;

  return shell({
    brand,
    preview: `Děkuji za platbu faktury ${d.invoiceNumber} • ${d.total}`,
    headerLabel: "Potvrzení platby",
    invoiceNumber: d.invoiceNumber,
    logo: logoOrName(d),
    body,
  });
}

// ───────────────────────── plain-text fallbacky ─────────────────────────

export function buildInvoicePlainText(d: SharedEmailData): string {
  const greeting = d.clientName ? `Dobrý den, ${d.clientName},` : "Dobrý den,";
  const note = d.personalNote ? `\n${d.personalNote}\n` : "";
  const link = d.invoiceUrl ? `\n\nZobrazit fakturu online:\n${d.invoiceUrl}` : "";
  const vs = d.variableSymbol ? `\nVariabilní symbol: ${d.variableSymbol}` : "";
  return `${greeting}
${note}
v příloze najdete fakturu č. ${d.invoiceNumber}.

Částka k úhradě: ${d.total}
Splatnost: ${d.dueDate}${vs}${link}

S pozdravem
${d.supplierName}

—
Vytvořeno ve Vystaveno.cz · ${VYSTAVENO_SUPPORT_EMAIL}`;
}

export function buildReminderPlainText(d: ReminderEmailData): string {
  const greeting = d.clientName ? `Dobrý den, ${d.clientName},` : "Dobrý den,";
  const intro =
    d.level === 1
      ? `dovoluji si Vás upozornit, že faktura č. ${d.invoiceNumber} je ${d.daysOverdue} ${pluralDays(d.daysOverdue)} po splatnosti. Pokud již proběhla platba, ignorujte prosím tento e-mail.`
      : d.level === 2
      ? `předchozí upomínka k faktuře č. ${d.invoiceNumber} zůstala bez odezvy. Faktura je nyní ${d.daysOverdue} ${pluralDays(d.daysOverdue)} po splatnosti. Prosím o její neodkladnou úhradu.`
      : `toto je poslední upomínka k úhradě faktury č. ${d.invoiceNumber}, která je ${d.daysOverdue} ${pluralDays(d.daysOverdue)} po splatnosti. Pokud nedojde k úhradě, budu nucen/a přistoupit k vymáhání pohledávky.`;
  const note = d.personalNote ? `\n${d.personalNote}\n` : "";
  const link = d.invoiceUrl ? `\n\nFaktura a platební údaje:\n${d.invoiceUrl}` : "";
  const vs = d.variableSymbol ? `\nVariabilní symbol: ${d.variableSymbol}` : "";
  return `${greeting}
${note}
${intro}

Dlužná částka: ${d.total}
Splatnost: ${d.dueDate}${vs}${link}

Děkuji za pochopení a s pozdravem
${d.supplierName}

—
Vytvořeno ve Vystaveno.cz · ${VYSTAVENO_SUPPORT_EMAIL}`;
}

export function buildThankYouPlainText(d: ThankYouEmailData): string {
  const greeting = d.clientName ? `Dobrý den, ${d.clientName},` : "Dobrý den,";
  const note = d.personalNote ? `\n${d.personalNote}\n` : "";
  const link = d.invoiceUrl ? `\n\nFakturu jako doklad o platbě stáhnete zde:\n${d.invoiceUrl}` : "";
  return `${greeting}
${note}
platba faktury č. ${d.invoiceNumber} (${d.total}) byla úspěšně přijata dne ${d.paidOn}. Velmi si Vaší promptní úhrady vážím.${link}

S díky a přáním pěkného dne
${d.supplierName}

—
Vytvořeno ve Vystaveno.cz · ${VYSTAVENO_SUPPORT_EMAIL}`;
}
