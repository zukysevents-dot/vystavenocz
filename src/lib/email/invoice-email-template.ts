/**
 * Vyrenderuje HTML pro fakturační e-mail.
 * Inline styly + table-based layout = funguje ve všech klientech (Gmail, Outlook, Apple Mail).
 */

export type InvoiceEmailData = {
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

export function renderInvoiceEmailHtml(d: InvoiceEmailData): string {
  const safe = (s: string | null | undefined) =>
    (s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const brand = isValidHexColor(d.brandColor) ? d.brandColor : "#0fbfb6";
  const greeting = d.clientName ? `Dobrý den, ${safe(d.clientName)},` : "Dobrý den,";
  const note = d.personalNote
    ? `<tr><td style="padding:0 32px 24px 32px;">
        <div style="background:#f8fafc;border-left:3px solid ${brand};padding:14px 18px;border-radius:6px;color:#475569;font-size:15px;line-height:1.6;white-space:pre-wrap;">${safe(d.personalNote)}</div>
      </td></tr>`
    : "";

  const logoBlock = d.logoUrl
    ? `<img src="${safe(d.logoUrl)}" alt="${safe(d.supplierName)}" height="40" style="display:block;max-height:40px;width:auto;border:0;outline:none;" />`
    : `<div style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">${safe(d.supplierName)}</div>`;

  const ctaButton = d.invoiceUrl
    ? `<tr><td align="center" style="padding:0 32px 28px 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="border-radius:8px;background:${brand};">
            <a href="${safe(d.invoiceUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Zobrazit fakturu online →</a>
          </td></tr>
        </table>
        <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;">Odkaz je platný 30 dní</p>
      </td></tr>`
    : "";

  const qrBlock = d.qrCid
    ? `<tr><td align="center" style="padding:8px 32px 28px 32px;">
        <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;background:#ffffff;display:inline-block;">
          <div style="font-size:13px;font-weight:600;color:#475569;margin:0 0 12px;text-transform:uppercase;letter-spacing:0.04em;">QR platba</div>
          <img src="cid:${safe(d.qrCid)}" alt="QR kód pro platbu" width="180" height="180" style="display:block;width:180px;height:180px;border:0;outline:none;" />
          <div style="font-size:12px;color:#64748b;margin:12px 0 0;max-width:180px;">Naskenujte ve své bankovní aplikaci</div>
        </div>
      </td></tr>`
    : "";

  const vsRow = d.variableSymbol
    ? rowKV("Variabilní symbol", safe(d.variableSymbol))
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="cs">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>Faktura ${safe(d.invoiceNumber)}</title>
<style>
  @media only screen and (max-width:600px) {
    .email-container { width:100% !important; }
    .px-mobile { padding-left:20px !important; padding-right:20px !important; }
    .stack { display:block !important; width:100% !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f1f5f9;">
    Faktura ${safe(d.invoiceNumber)} • ${safe(d.total)} • splatnost ${safe(d.dueDate)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f1f5f9;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

        <!-- Header s brandem -->
        <tr><td style="background:${brand};padding:28px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="vertical-align:middle;">${logoBlock}</td>
              <td align="right" style="vertical-align:middle;">
                <div style="font-size:12px;color:rgba(255,255,255,0.85);font-weight:500;text-transform:uppercase;letter-spacing:0.06em;">Faktura</div>
                <div style="font-size:18px;color:#ffffff;font-weight:700;margin-top:2px;">${safe(d.invoiceNumber)}</div>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Pozdrav -->
        <tr><td class="px-mobile" style="padding:32px 32px 12px 32px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.01em;">${greeting}</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#475569;">v příloze Vám zasílám fakturu č. <strong style="color:#0f172a;">${safe(d.invoiceNumber)}</strong>. Souhrn naleznete níže.</p>
        </td></tr>

        ${note}

        <!-- Souhrn faktury -->
        <tr><td class="px-mobile" style="padding:8px 32px 12px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:20px 22px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
              <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px;">Částka k úhradě</div>
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
        </td></tr>

        <!-- CTA -->
        ${ctaButton}

        <!-- QR -->
        ${qrBlock}

        <!-- Patička s info -->
        <tr><td class="px-mobile" style="padding:0 32px 28px 32px;">
          <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.6;">V případě dotazů mě neváhejte kontaktovat${d.replyToEmail ? ` na <a href="mailto:${safe(d.replyToEmail)}" style="color:${brand};text-decoration:none;font-weight:500;">${safe(d.replyToEmail)}</a>` : ""}.</p>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">S pozdravem,<br/><strong style="color:#0f172a;">${safe(d.supplierName)}</strong></p>
        </td></tr>

        <!-- Bottom bar -->
        <tr><td style="background:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">Vytvořeno ve <a href="https://vystaveno.cz" style="color:${brand};text-decoration:none;font-weight:500;">Vystaveno.cz</a></p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function rowKV(key: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#64748b;width:50%;">${key}</td>
    <td style="padding:6px 0;color:#0f172a;text-align:right;">${value}</td>
  </tr>`;
}

function isValidHexColor(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c);
}
