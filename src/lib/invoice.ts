/**
 * Sdílené utility pro fakturaci: výpočty DPH, SPAYD QR string, formátování.
 */

export type VatRate = 0 | 12 | 21;

export type InvoiceItemDraft = {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: VatRate;
};

export type SupplierSnapshot = {
  company_name: string | null;
  full_name?: string | null;
  ico: string | null;
  dic: string | null;
  vat_mode?: "payer" | "identified" | "non_payer";
  street: string | null;
  city: string | null;
  zip: string | null;
  country?: string;
  bank_account?: string | null;
  iban?: string | null;
  swift?: string | null;
  email?: string | null;
  logo_url?: string | null;
  invoice_color?: string | null;
};

export type ClientSnapshot = {
  name: string;
  ico?: string | null;
  dic?: string | null;
  street?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: string;
  email?: string | null;
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type LineCalc = {
  line_subtotal: number;
  line_vat: number;
  line_total: number;
};

export function calcLine(item: InvoiceItemDraft, vatPayer: boolean): LineCalc {
  const subtotal = round2(item.quantity * item.unit_price);
  const vat = vatPayer ? round2((subtotal * item.vat_rate) / 100) : 0;
  return { line_subtotal: subtotal, line_vat: vat, line_total: round2(subtotal + vat) };
}

export type InvoiceTotals = {
  subtotal: number;
  vat_total: number;
  total: number;
  vat_breakdown: Record<number, { base: number; vat: number }>;
};

export function calcTotals(items: InvoiceItemDraft[], vatPayer: boolean): InvoiceTotals {
  const breakdown: Record<number, { base: number; vat: number }> = {};
  let subtotal = 0;
  let vat_total = 0;
  for (const it of items) {
    const { line_subtotal, line_vat } = calcLine(it, vatPayer);
    subtotal += line_subtotal;
    vat_total += line_vat;
    if (vatPayer) {
      const k = it.vat_rate;
      if (!breakdown[k]) breakdown[k] = { base: 0, vat: 0 };
      breakdown[k].base += line_subtotal;
      breakdown[k].vat += line_vat;
    }
  }
  // round breakdown
  for (const k of Object.keys(breakdown)) {
    breakdown[Number(k)].base = round2(breakdown[Number(k)].base);
    breakdown[Number(k)].vat = round2(breakdown[Number(k)].vat);
  }
  subtotal = round2(subtotal);
  vat_total = round2(vat_total);
  return { subtotal, vat_total, total: round2(subtotal + vat_total), vat_breakdown: breakdown };
}

export function formatCZK(n: number, currency = "CZK"): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("cs-CZ").format(date);
}

/**
 * Převede české číslo účtu (např. "2702345678/2010" nebo "19-2000145399/0800") na IBAN.
 * Reference: https://www.cnb.cz/cs/platebni-styk/iban/
 */
export function czAccountToIban(account: string): string | null {
  if (!account) return null;
  const cleaned = account.replace(/\s/g, "");
  const match = cleaned.match(/^(?:(\d{1,6})-)?(\d{1,10})\/(\d{4})$/);
  if (!match) return null;
  const [, prefix = "", number, bank] = match;
  const prefixPad = prefix.padStart(6, "0");
  const numberPad = number.padStart(10, "0");
  const bban = `${bank}${prefixPad}${numberPad}`; // 20 chars
  // mod-97 podle ISO 13616: BBAN + země převedené na čísla (A=10..Z=35) + "00"
  // C = 12, Z = 35  →  "CZ" se přepíše na "1235"
  const checkSrc = bban + "1235" + "00";
  const remainder = mod97(checkSrc);
  const check = String(98 - remainder).padStart(2, "0");
  return `CZ${check}${bban}`;
}

function mod97(num: string): number {
  let rem = 0;
  for (const c of num) {
    rem = (rem * 10 + Number(c)) % 97;
  }
  return rem;
}

/**
 * Generuje SPAYD řetězec (Short Payment Descriptor) — ČBA standard pro QR platby.
 * Příklad: SPD*1.0*ACC:CZ6508000000192000145399*AM:480.55*CC:CZK*MSG:PLATBA
 */
export function buildSpayd(opts: {
  iban: string;
  amount: number;
  currency?: string;
  variableSymbol?: string;
  message?: string;
  swift?: string | null;
}): string {
  const parts: string[] = ["SPD*1.0", `ACC:${opts.iban.replace(/\s/g, "")}${opts.swift ? "+" + opts.swift : ""}`];
  parts.push(`AM:${opts.amount.toFixed(2)}`);
  parts.push(`CC:${opts.currency || "CZK"}`);
  if (opts.variableSymbol) parts.push(`X-VS:${opts.variableSymbol.replace(/\D/g, "")}`);
  if (opts.message) {
    const msg = opts.message
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9 .,:_-]/g, "")
      .slice(0, 60);
    if (msg) parts.push(`MSG:${msg}`);
  }
  return parts.join("*");
}

/** Vygeneruje variabilní symbol z čísla faktury (jen číslice, max 10). */
export function variableSymbolFromInvoiceNumber(num: string): string {
  return num.replace(/\D/g, "").slice(-10);
}

/** Generování čísla faktury podle profilu. */
export function buildInvoiceNumber(
  prefix: string,
  format: string,
  seq: number,
  date = new Date(),
): string {
  const year = String(date.getFullYear());
  const seqStr = String(seq).padStart(4, "0");
  return format
    .replace("{prefix}", prefix || "FA")
    .replace("{year}", year)
    .replace("{seq}", seqStr);
}
