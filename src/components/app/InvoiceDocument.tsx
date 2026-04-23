/**
 * Vizuální podoba faktury — používaná v živém náhledu i jako zdroj pro PDF.
 * Renderuje na pevné šířce A4 (794px @ 96dpi) pro snadné zachycení html2canvas.
 */
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  buildSpayd,
  calcLine,
  calcTotals,
  czAccountToIban,
  formatCZK,
  formatDate,
  variableSymbolFromInvoiceNumber,
  type ClientSnapshot,
  type InvoiceItemDraft,
  type SupplierSnapshot,
} from "@/lib/invoice";

export type InvoiceDocumentProps = {
  supplier: SupplierSnapshot;
  client: ClientSnapshot;
  items: InvoiceItemDraft[];
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  taxableDate: string;
  variableSymbol?: string;
  notes?: string;
  paymentMethod?: string;
  currency?: string;
  /** Konstantní symbol — zobrazí se v meta řádku jen pokud má hodnotu. */
  constantSymbol?: string | null;
  /** Specifický symbol — zobrazí se v meta řádku jen pokud má hodnotu. */
  specificSymbol?: string | null;
  /** Stornovaná faktura — vykreslí přes celou stránku výrazný vodoznak. */
  cancelled?: boolean;
  /** Typ dokladu — běžná faktura nebo dobropis (opravný daňový doklad). */
  documentType?: "invoice" | "credit_note";
  /** Číslo původní faktury, ke které dobropis patří (jen pro credit_note). */
  originalInvoiceNumber?: string | null;
  /** Zobrazit patičku „Vystaveno v aplikaci Vystaveno". Default true. */
  showFooter?: boolean;
  /** Zobrazit detailní rozpis DPH po sazbách. Default true (jen pro plátce). */
  showVatBreakdown?: boolean;
  /** Způsob zobrazení dobropisu na PDF.
   *  - "full"    : plný titulek „Opravný daňový doklad — dobropis" v hlavičce (default)
   *  - "compact" : titulek zůstane „Faktura — daňový doklad" + diskrétní badge „DOBROPIS" vpravo nahoře
   */
  creditNoteDisplay?: "full" | "compact";
};

export function InvoiceDocument(props: InvoiceDocumentProps) {
  const {
    supplier,
    client,
    items,
    invoiceNumber,
    issueDate,
    dueDate,
    taxableDate,
    variableSymbol,
    notes,
    paymentMethod = "bank_transfer",
    currency = "CZK",
    constantSymbol = null,
    specificSymbol = null,
    cancelled = false,
    documentType = "invoice",
    originalInvoiceNumber = null,
    showFooter = true,
    showVatBreakdown = true,
    creditNoteDisplay = "full",
  } = props;

  const isCreditNote = documentType === "credit_note";
  const documentTitle =
    isCreditNote && creditNoteDisplay === "full"
      ? "Opravný daňový doklad — dobropis"
      : "Faktura — daňový doklad";
  const showCompactCreditBadge = isCreditNote && creditNoteDisplay === "compact";

  const vatPayer = supplier.vat_mode === "payer";
  const totals = calcTotals(items, vatPayer);
  const vs = variableSymbol || variableSymbolFromInvoiceNumber(invoiceNumber);
  const iban =
    supplier.iban?.replace(/\s/g, "") ||
    (supplier.bank_account ? czAccountToIban(supplier.bank_account) : null);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!iban || totals.total <= 0 || paymentMethod !== "bank_transfer") {
      setQrDataUrl(null);
      return;
    }
    const spayd = buildSpayd({
      iban,
      amount: totals.total,
      currency,
      variableSymbol: vs,
      message: invoiceNumber,
      swift: supplier.swift,
    });
    QRCode.toDataURL(spayd, { margin: 1, width: 200, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [iban, totals.total, currency, vs, invoiceNumber, supplier.swift, paymentMethod]);

  const accentColor = supplier.invoice_color || "#0fbfb6";

  return (
    <div
      id="invoice-document"
      className="mx-auto bg-white text-slate-900"
      style={{ width: "794px", minHeight: "1123px", padding: "48px", fontFamily: "Inter, system-ui, sans-serif", fontSize: "12px", lineHeight: 1.5, position: "relative", overflow: "hidden" }}
    >
      {cancelled && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div
            style={{
              transform: "rotate(-28deg)",
              border: "10px solid #dc2626",
              color: "#dc2626",
              fontWeight: 900,
              fontSize: "120px",
              letterSpacing: "0.08em",
              padding: "16px 56px",
              borderRadius: "12px",
              opacity: 0.22,
              fontFamily: "Inter, system-ui, sans-serif",
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            Stornováno
          </div>
        </div>
      )}
      {/* Hlavička */}
      <div className="flex items-start justify-between" style={{ borderBottom: `3px solid ${accentColor}`, paddingBottom: "16px" }}>
        <div>
          {supplier.logo_url ? (
            <img src={supplier.logo_url} alt="logo" style={{ maxHeight: "56px", maxWidth: "180px", objectFit: "contain" }} crossOrigin="anonymous" />
          ) : (
            <div style={{ fontSize: "20px", fontWeight: 700, color: accentColor }}>
              {supplier.company_name || supplier.full_name || "—"}
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          {showCompactCreditBadge && (
            <div
              style={{
                display: "inline-block",
                marginBottom: "6px",
                padding: "2px 10px",
                borderRadius: "999px",
                background: "#fee2e2",
                color: "#991b1b",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Dobropis
            </div>
          )}
          <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {documentTitle}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: accentColor, marginTop: "4px" }}>
            {invoiceNumber}
          </div>
          {isCreditNote && originalInvoiceNumber && (
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
              k faktuře <strong>{originalInvoiceNumber}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Dodavatel + Odběratel */}
      <div className="grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginTop: "24px" }}>
        <Block title="Dodavatel" accent={accentColor}>
          <div style={{ fontWeight: 600, fontSize: "13px" }}>
            {supplier.company_name || supplier.full_name || "—"}
          </div>
          {supplier.street && <div>{supplier.street}</div>}
          {(supplier.zip || supplier.city) && (
            <div>
              {supplier.zip} {supplier.city}
            </div>
          )}
          {supplier.country && supplier.country !== "CZ" && <div>{supplier.country}</div>}
          <div style={{ marginTop: "8px" }}>
            {supplier.ico && <div>IČO: <strong>{supplier.ico}</strong></div>}
            {supplier.dic && <div>DIČ: <strong>{supplier.dic}</strong></div>}
            {!vatPayer && (
              <div style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                {supplier.vat_mode === "identified" ? "Identifikovaná osoba" : "Neplátce DPH"}
              </div>
            )}
          </div>
        </Block>

        <Block title="Odběratel" accent={accentColor}>
          <div style={{ fontWeight: 600, fontSize: "13px" }}>{client.name}</div>
          {client.street && <div>{client.street}</div>}
          {(client.zip || client.city) && (
            <div>
              {client.zip} {client.city}
            </div>
          )}
          {client.country && client.country !== "CZ" && <div>{client.country}</div>}
          <div style={{ marginTop: "8px" }}>
            {client.ico && <div>IČO: <strong>{client.ico}</strong></div>}
            {client.dic && <div>DIČ: <strong>{client.dic}</strong></div>}
          </div>
        </Block>
      </div>

      {/* Meta info */}
      {(() => {
        const ks = constantSymbol?.trim() || "";
        const ss = specificSymbol?.trim() || "";
        const cells: Array<{ label: string; value: string }> = [
          { label: "Datum vystavení", value: formatDate(issueDate) },
          { label: vatPayer ? "DUZP" : "Datum plnění", value: formatDate(taxableDate) },
          { label: "Datum splatnosti", value: formatDate(dueDate) },
          { label: "Variabilní symbol", value: vs },
        ];
        if (ks) cells.push({ label: "Konstantní symbol", value: ks });
        if (ss) cells.push({ label: "Specifický symbol", value: ss });
        // Při 4 polích → 4 sloupce; při 5–6 polích přejdeme na 3 sloupce ve dvou řádcích pro lepší čitelnost.
        const cols = cells.length <= 4 ? cells.length : 3;
        return (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "12px", marginTop: "24px", padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
            {cells.map((c) => (
              <MetaCell key={c.label} label={c.label} value={c.value} />
            ))}
          </div>
        );
      })()}

      {/* Položky */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "24px", fontSize: "11.5px" }}>
        <thead>
          <tr style={{ background: accentColor, color: "#fff" }}>
            <th style={{ padding: "8px 10px", textAlign: "left" }}>Popis</th>
            <th style={{ padding: "8px 10px", textAlign: "right", width: "60px" }}>Množ.</th>
            <th style={{ padding: "8px 10px", textAlign: "left", width: "50px" }}>MJ</th>
            <th style={{ padding: "8px 10px", textAlign: "right", width: "90px" }}>Cena/MJ</th>
            {vatPayer && <th style={{ padding: "8px 10px", textAlign: "right", width: "60px" }}>DPH</th>}
            <th style={{ padding: "8px 10px", textAlign: "right", width: "100px" }}>
              {vatPayer ? "Celkem s DPH" : "Celkem"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={vatPayer ? 6 : 5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                Zatím žádné položky
              </td>
            </tr>
          )}
          {items.map((it) => {
            const calc = calcLine(it, vatPayer);
            return (
              <tr key={it.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "10px" }}>{it.description || "—"}</td>
                <td style={{ padding: "10px", textAlign: "right" }}>{it.quantity}</td>
                <td style={{ padding: "10px" }}>{it.unit}</td>
                <td style={{ padding: "10px", textAlign: "right" }}>{formatCZK(it.unit_price, currency)}</td>
                {vatPayer && <td style={{ padding: "10px", textAlign: "right" }}>{it.vat_rate}%</td>}
                <td style={{ padding: "10px", textAlign: "right", fontWeight: 600 }}>
                  {formatCZK(calc.line_total, currency)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Souhrn */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "32px", marginTop: "24px" }}>
        <div>
          {paymentMethod === "bank_transfer" && (supplier.bank_account || supplier.iban) && (
            <Block title="Platební údaje" accent={accentColor}>
              {supplier.bank_account && (
                <div>Číslo účtu: <strong>{supplier.bank_account}</strong></div>
              )}
              {iban && <div>IBAN: <strong>{iban}</strong></div>}
              {supplier.swift && <div>SWIFT: <strong>{supplier.swift}</strong></div>}
              <div>VS: <strong>{vs}</strong></div>
              {constantSymbol?.trim() && <div>KS: <strong>{constantSymbol.trim()}</strong></div>}
              {specificSymbol?.trim() && <div>SS: <strong>{specificSymbol.trim()}</strong></div>}
              <div style={{ marginTop: "4px", fontSize: "11px", color: "#64748b" }}>
                Způsob úhrady: bankovní převod
              </div>
            </Block>
          )}
          {qrDataUrl && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                QR platba
              </div>
              <img src={qrDataUrl} alt="QR platba" style={{ width: "140px", height: "140px" }} />
            </div>
          )}
        </div>

        <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "16px" }}>
          {vatPayer && (
            <>
              <Row label="Základ daně" value={formatCZK(totals.subtotal, currency)} />
              {showVatBreakdown &&
                Object.entries(totals.vat_breakdown).map(([rate, b]) => (
                  <Row
                    key={rate}
                    label={`DPH ${rate}% z ${formatCZK(b.base, currency)}`}
                    value={formatCZK(b.vat, currency)}
                  />
                ))}
              <Row label="DPH celkem" value={formatCZK(totals.vat_total, currency)} />
              <div style={{ borderTop: "2px solid #cbd5e1", marginTop: "8px", paddingTop: "8px" }}>
                <Row label="K úhradě" value={formatCZK(totals.total, currency)} bold accent={accentColor} />
              </div>
            </>
          )}
          {!vatPayer && (
            <>
              <Row label="Mezisoučet" value={formatCZK(totals.subtotal, currency)} />
              <div style={{ borderTop: "2px solid #cbd5e1", marginTop: "8px", paddingTop: "8px" }}>
                <Row label="K úhradě" value={formatCZK(totals.total, currency)} bold accent={accentColor} />
              </div>
            </>
          )}
        </div>
      </div>

      {notes && (
        <div style={{ marginTop: "24px", padding: "12px", borderLeft: `3px solid ${accentColor}`, background: "#f8fafc", fontSize: "11.5px" }}>
          {notes}
        </div>
      )}

      {showFooter && (
        <div style={{ marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", textAlign: "center", fontSize: "10px", color: "#94a3b8" }}>
          Vystaveno v aplikaci Vystaveno · vystaveno.cz
        </div>
      )}
    </div>
  );
}

function Block({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: accent, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: "6px" }}>
        {title}
      </div>
      <div style={{ color: "#334155" }}>{children}</div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: "9.5px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ fontWeight: 600, marginTop: "2px" }}>{value}</div>
    </div>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontWeight: bold ? 700 : 400, fontSize: bold ? "14px" : "12px", color: bold && accent ? accent : "#334155" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
