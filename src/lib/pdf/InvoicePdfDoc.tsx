/**
 * Vektorové PDF faktury pomocí @react-pdf/renderer.
 * Plná podpora českých znaků (ě, š, č, ř, ž, ů, ť, ň) díky embedded Inter fontu (latin-ext).
 * Selectovatelný text, malé soubory (~50 kB místo ~500 kB rastru), perfektní typografie.
 */
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import {
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

// Registrace Inter fontu (verze v20 z Google Fonts) — TTF obsahuje plnou
// latin-ext sadu (2849 glyfů) včetně ě š č ř ž ť ň ů Ů a symbolů € № ‰ • – —.
// Předchozí v13 URL pro semibold vracela 404 — proto pevně držíme v20.
let fontRegistered = false;
function ensureFontRegistered() {
  if (fontRegistered) return;
  try {
    Font.register({
      family: "Inter",
      fonts: [
        {
          src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
          fontWeight: 400,
        },
        {
          src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf",
          fontWeight: 600,
        },
        {
          src: "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf",
          fontWeight: 700,
        },
      ],
    });
    // Vypneme automatické dělení slov (lépe pro účetní dokumenty)
    Font.registerHyphenationCallback((word) => [word]);
    fontRegistered = true;
  } catch {
    // Při opakované registraci tiše ignorujeme
    fontRegistered = true;
  }
}

export type InvoicePdfProps = {
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
  constantSymbol?: string | null;
  specificSymbol?: string | null;
  cancelled?: boolean;
  documentType?: "invoice" | "credit_note";
  originalInvoiceNumber?: string | null;
  showFooter?: boolean;
  showVatBreakdown?: boolean;
  creditNoteDisplay?: "full" | "compact";
  /** QR platba jako data URL (PNG) — předáno z volajícího kódu (vygenerované přes qrcode). */
  qrDataUrl?: string | null;
};

export function InvoicePdfDocument(props: InvoicePdfProps) {
  ensureFontRegistered();

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
    qrDataUrl = null,
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

  const accent = supplier.invoice_color || "#0fbfb6";
  const styles = makeStyles(accent);

  const ks = constantSymbol?.trim() || "";
  const ss = specificSymbol?.trim() || "";
  const metaCells: Array<{ label: string; value: string }> = [
    { label: "Datum vystavení", value: formatDate(issueDate) },
    { label: vatPayer ? "DUZP" : "Datum plnění", value: formatDate(taxableDate) },
    { label: "Datum splatnosti", value: formatDate(dueDate) },
    { label: "Variabilní symbol", value: vs },
  ];
  if (ks) metaCells.push({ label: "Konstantní symbol", value: ks });
  if (ss) metaCells.push({ label: "Specifický symbol", value: ss });

  return (
    <Document title={`${documentTitle} ${invoiceNumber}`} author={supplier.company_name || supplier.full_name || "Vystaveno.cz"}>
      <Page size="A4" style={styles.page}>
        {cancelled && (
          <View style={styles.cancelledOverlay} fixed>
            <Text style={styles.cancelledText}>STORNOVÁNO</Text>
          </View>
        )}

        {/* HLAVIČKA */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {supplier.logo_url ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={supplier.logo_url} style={styles.logo} />
            ) : (
              <Text style={styles.brandText}>
                {supplier.company_name || supplier.full_name || "—"}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {showCompactCreditBadge && (
              <View style={styles.creditBadge}>
                <Text style={styles.creditBadgeText}>DOBROPIS</Text>
              </View>
            )}
            <Text style={styles.documentTitle}>{documentTitle}</Text>
            <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            {isCreditNote && originalInvoiceNumber && (
              <Text style={styles.originalRef}>
                k faktuře <Text style={styles.bold}>{originalInvoiceNumber}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* DODAVATEL + ODBĚRATEL */}
        <View style={styles.partiesRow}>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Dodavatel</Text>
            <Text style={styles.partyName}>
              {supplier.company_name || supplier.full_name || "—"}
            </Text>
            {supplier.street ? <Text>{supplier.street}</Text> : null}
            {(supplier.zip || supplier.city) ? (
              <Text>
                {supplier.zip} {supplier.city}
              </Text>
            ) : null}
            {supplier.country && supplier.country !== "CZ" ? (
              <Text>{supplier.country}</Text>
            ) : null}
            {supplier.ico ? <Text style={styles.idLine}>IČO: <Text style={styles.bold}>{supplier.ico}</Text></Text> : null}
            {supplier.dic ? <Text style={styles.idLine}>DIČ: <Text style={styles.bold}>{supplier.dic}</Text></Text> : null}
            {!vatPayer ? (
              <Text style={styles.muted}>
                {supplier.vat_mode === "identified" ? "Identifikovaná osoba" : "Neplátce DPH"}
              </Text>
            ) : null}
          </View>
          <View style={styles.partyCol}>
            <Text style={styles.partyLabel}>Odběratel</Text>
            <Text style={styles.partyName}>{client.name}</Text>
            {client.street ? <Text>{client.street}</Text> : null}
            {(client.zip || client.city) ? (
              <Text>
                {client.zip} {client.city}
              </Text>
            ) : null}
            {client.country && client.country !== "CZ" ? <Text>{client.country}</Text> : null}
            {client.ico ? <Text style={styles.idLine}>IČO: <Text style={styles.bold}>{client.ico}</Text></Text> : null}
            {client.dic ? <Text style={styles.idLine}>DIČ: <Text style={styles.bold}>{client.dic}</Text></Text> : null}
          </View>
        </View>

        {/* META */}
        <View style={styles.metaBox}>
          {metaCells.map((c) => (
            <View key={c.label} style={styles.metaCell}>
              <Text style={styles.metaLabel}>{c.label}</Text>
              <Text style={styles.metaValue}>{c.value}</Text>
            </View>
          ))}
        </View>

        {/* POLOŽKY */}
        <View style={styles.tableHeader}>
          <Text style={[styles.thCell, styles.thDesc]}>Popis</Text>
          <Text style={[styles.thCell, styles.thQty]}>Množ.</Text>
          <Text style={[styles.thCell, styles.thUnit]}>MJ</Text>
          <Text style={[styles.thCell, styles.thPrice]}>Cena/MJ</Text>
          {vatPayer && <Text style={[styles.thCell, styles.thVat]}>DPH</Text>}
          <Text style={[styles.thCell, styles.thTotal]}>
            {vatPayer ? "Celkem s DPH" : "Celkem"}
          </Text>
        </View>
        {items.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.muted}>Zatím žádné položky</Text>
          </View>
        )}
        {items.map((it) => {
          const calc = calcLine(it, vatPayer);
          return (
            <View key={it.id} style={styles.tdRow} wrap={false}>
              <Text style={[styles.tdCell, styles.thDesc]}>{it.description || "—"}</Text>
              <Text style={[styles.tdCell, styles.thQty]}>{String(it.quantity)}</Text>
              <Text style={[styles.tdCell, styles.thUnit]}>{it.unit}</Text>
              <Text style={[styles.tdCell, styles.thPrice]}>{formatCZK(it.unit_price, currency)}</Text>
              {vatPayer && <Text style={[styles.tdCell, styles.thVat]}>{it.vat_rate}%</Text>}
              <Text style={[styles.tdCell, styles.thTotal, styles.bold]}>
                {formatCZK(calc.line_total, currency)}
              </Text>
            </View>
          );
        })}

        {/* SOUHRN + PLATEBNÍ ÚDAJE */}
        <View style={styles.summaryRow} wrap={false}>
          <View style={styles.summaryLeft}>
            {paymentMethod === "bank_transfer" && (supplier.bank_account || supplier.iban) && (
              <View>
                <Text style={styles.partyLabel}>Platební údaje</Text>
                {supplier.bank_account ? (
                  <Text>Číslo účtu: <Text style={styles.bold}>{supplier.bank_account}</Text></Text>
                ) : null}
                {iban ? <Text>IBAN: <Text style={styles.bold}>{iban}</Text></Text> : null}
                {supplier.swift ? <Text>SWIFT: <Text style={styles.bold}>{supplier.swift}</Text></Text> : null}
                <Text>VS: <Text style={styles.bold}>{vs}</Text></Text>
                {ks ? <Text>KS: <Text style={styles.bold}>{ks}</Text></Text> : null}
                {ss ? <Text>SS: <Text style={styles.bold}>{ss}</Text></Text> : null}
                <Text style={styles.muted}>Způsob úhrady: bankovní převod</Text>
              </View>
            )}
            {qrDataUrl && paymentMethod === "bank_transfer" ? (
              <View style={styles.qrBox}>
                <Text style={styles.metaLabel}>QR platba</Text>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={qrDataUrl} style={styles.qrImage} />
              </View>
            ) : null}
          </View>
          <View style={styles.summaryRight}>
            {vatPayer ? (
              <>
                <SummaryLine label="Základ daně" value={formatCZK(totals.subtotal, currency)} />
                {showVatBreakdown &&
                  Object.entries(totals.vat_breakdown).map(([rate, b]) => (
                    <SummaryLine
                      key={rate}
                      label={`DPH ${rate}% z ${formatCZK(b.base, currency)}`}
                      value={formatCZK(b.vat, currency)}
                    />
                  ))}
                <SummaryLine label="DPH celkem" value={formatCZK(totals.vat_total, currency)} />
                <View style={styles.totalDivider} />
                <SummaryLine
                  label="K úhradě"
                  value={formatCZK(totals.total, currency)}
                  bold
                  accent={accent}
                />
              </>
            ) : (
              <>
                <SummaryLine label="Mezisoučet" value={formatCZK(totals.subtotal, currency)} />
                <View style={styles.totalDivider} />
                <SummaryLine
                  label="K úhradě"
                  value={formatCZK(totals.total, currency)}
                  bold
                  accent={accent}
                />
              </>
            )}
          </View>
        </View>

        {notes ? (
          <View style={styles.notesBox}>
            <Text>{notes}</Text>
          </View>
        ) : null}

        {showFooter && (
          <Text style={styles.footer} fixed>
            Vystaveno v aplikaci Vystaveno · vystaveno.cz
          </Text>
        )}
      </Page>
    </Document>
  );
}

function SummaryLine({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
      <Text style={{ fontSize: bold ? 13 : 10, fontWeight: bold ? 700 : 400, color: bold && accent ? accent : "#334155" }}>
        {label}
      </Text>
      <Text style={{ fontSize: bold ? 13 : 10, fontWeight: bold ? 700 : 400, color: bold && accent ? accent : "#334155" }}>
        {value}
      </Text>
    </View>
  );
}

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: {
      paddingTop: 36,
      paddingBottom: 48,
      paddingHorizontal: 36,
      fontFamily: "Inter",
      fontSize: 10,
      color: "#0f172a",
      lineHeight: 1.5,
    },
    cancelledOverlay: {
      position: "absolute",
      top: 280,
      left: 0,
      right: 0,
      alignItems: "center",
      opacity: 0.18,
    },
    cancelledText: {
      fontSize: 100,
      fontWeight: 700,
      color: "#dc2626",
      transform: "rotate(-22deg)",
      letterSpacing: 6,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingBottom: 12,
      borderBottomWidth: 2,
      borderBottomColor: accent,
    },
    headerLeft: { maxWidth: 260 },
    headerRight: { alignItems: "flex-end", maxWidth: 260 },
    logo: { maxHeight: 50, maxWidth: 180, objectFit: "contain" },
    brandText: { fontSize: 16, fontWeight: 700, color: accent },
    creditBadge: {
      backgroundColor: "#fee2e2",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      marginBottom: 4,
    },
    creditBadgeText: { fontSize: 8, fontWeight: 700, color: "#991b1b", letterSpacing: 0.8 },
    documentTitle: {
      fontSize: 9,
      color: "#64748b",
      letterSpacing: 0.6,
      textTransform: "uppercase",
    },
    invoiceNumber: { fontSize: 20, fontWeight: 700, color: accent, marginTop: 2 },
    originalRef: { fontSize: 9, color: "#64748b", marginTop: 2 },

    partiesRow: { flexDirection: "row", gap: 24, marginTop: 18 },
    partyCol: { flex: 1 },
    partyLabel: {
      fontSize: 8,
      fontWeight: 700,
      color: accent,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      marginBottom: 4,
    },
    partyName: { fontWeight: 600, fontSize: 11, marginBottom: 2 },
    idLine: { marginTop: 4 },
    muted: { color: "#64748b", fontSize: 9, marginTop: 4 },
    bold: { fontWeight: 700 },

    metaBox: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 18,
      padding: 10,
      backgroundColor: "#f8fafc",
      borderRadius: 6,
    },
    metaCell: { flexBasis: "22%", flexGrow: 1 },
    metaLabel: { fontSize: 7.5, color: "#64748b", letterSpacing: 0.5, textTransform: "uppercase" },
    metaValue: { fontWeight: 600, marginTop: 1, fontSize: 10 },

    tableHeader: {
      flexDirection: "row",
      backgroundColor: accent,
      color: "#ffffff",
      paddingVertical: 6,
      paddingHorizontal: 4,
      marginTop: 18,
      borderRadius: 3,
    },
    thCell: { color: "#ffffff", fontWeight: 600, fontSize: 9, paddingHorizontal: 4 },
    thDesc: { flex: 3, textAlign: "left" },
    thQty: { width: 38, textAlign: "right" },
    thUnit: { width: 32, textAlign: "left" },
    thPrice: { width: 70, textAlign: "right" },
    thVat: { width: 36, textAlign: "right" },
    thTotal: { width: 80, textAlign: "right" },

    tdRow: {
      flexDirection: "row",
      paddingVertical: 6,
      paddingHorizontal: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: "#e2e8f0",
    },
    tdCell: { fontSize: 9.5, paddingHorizontal: 4 },
    emptyRow: { padding: 12, alignItems: "center" },

    summaryRow: { flexDirection: "row", marginTop: 18, gap: 24 },
    summaryLeft: { flex: 1 },
    summaryRight: {
      width: 230,
      backgroundColor: "#f8fafc",
      padding: 12,
      borderRadius: 6,
    },
    totalDivider: { borderTopWidth: 1.5, borderTopColor: "#cbd5e1", marginTop: 6, paddingTop: 4 },

    qrBox: { marginTop: 10 },
    qrImage: { width: 100, height: 100, marginTop: 4 },

    notesBox: {
      marginTop: 18,
      padding: 10,
      borderLeftWidth: 2,
      borderLeftColor: accent,
      backgroundColor: "#f8fafc",
      fontSize: 9.5,
    },

    footer: {
      position: "absolute",
      bottom: 24,
      left: 36,
      right: 36,
      textAlign: "center",
      fontSize: 8,
      color: "#94a3b8",
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: "#e2e8f0",
    },
  });
}