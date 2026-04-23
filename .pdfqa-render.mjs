import React from "react";
import { pdf, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { writeFileSync } from "node:fs";

Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1ZL7.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa25L7SUc.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1xL7SUc.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]);

const s = StyleSheet.create({
  page: { padding: 36, fontFamily: "Inter", fontSize: 11, color: "#0f172a" },
  h: { fontSize: 18, fontWeight: 700, marginBottom: 12, color: "#0fbfb6" },
  h2: { fontSize: 12, fontWeight: 600, marginTop: 16, marginBottom: 6 },
  row: { marginVertical: 2 },
  bold: { fontWeight: 700 },
  big: { fontSize: 26, fontWeight: 700, marginVertical: 6 },
});

const samples = [
  "Příliš žluťoučký kůň úpěl ďábelské ódy.",
  "ě š č ř ž ý á í é ú ů ť ň ď",
  "Ě Š Č Ř Ž Ý Á Í É Ú Ů Ť Ň Ď",
  "Faktura — daňový doklad č. FA-2026-0007",
  "Datum vystavení: 23. 4. 2026 · DUZP: 23. 4. 2026 · Splatnost: 7. 5. 2026",
  "Konstantní symbol 0308, variabilní symbol 20260007",
  "Příjemce: Žížala s.r.o., Křížová 12, 110 00 Praha",
  "Položka: Vývoj webu — měsíční paušál (8 hodin)",
  "Mezisoučet 12 500,00 Kč · DPH 21 % 2 625,00 Kč · K úhradě 15 125,00 Kč",
  "Děkujeme za včasnou úhradu. Přejeme úspěšný den!",
];

const doc = React.createElement(Document, { title: "QA test" },
  React.createElement(Page, { size: "A4", style: s.page },
    React.createElement(Text, { style: s.h }, "Český jazyk — test diakritiky (Inter latin-ext)"),
    React.createElement(Text, { style: s.h2 }, "Velký font — kontrola glyfů"),
    React.createElement(Text, { style: s.big }, "ěščřžýáíéúůťňď ĚŠČŘŽÝÁÍÉÚŮŤŇĎ"),
    React.createElement(Text, { style: s.h2 }, "Reálné věty z faktur"),
    ...samples.map((t, i) => React.createElement(Text, { key: i, style: s.row }, t)),
    React.createElement(Text, { style: s.h2 }, "Tučný řez"),
    React.createElement(Text, { style: [s.row, s.bold] }, "Příliš žluťoučký kůň úpěl ďábelské ódy."),
    React.createElement(Text, { style: s.h2 }, "Speciální znaky a symboly"),
    React.createElement(Text, { style: s.row }, "€ £ § © ® ™ ° № ‰ × ÷ ± ≈ → ← ↑ ↓ • – —"),
    React.createElement(Text, { style: s.h2 }, "Velké číslo"),
    React.createElement(Text, { style: s.big }, "1 234 567,89 Kč"),
  )
);

const blob = await pdf(doc).toBlob();
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("/tmp/pdfqa/cz-test.pdf", buf);
console.log("OK", buf.length, "bytes");
