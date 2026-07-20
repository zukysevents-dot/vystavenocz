# Compliance matice — stav k 20. 7. 2026

Vlastník „O" = operátor (Patrik Zukal), „V" = vývoj, „A" = advokát. Riziko: 🔴 vysoké / 🟠 střední / 🟢 nízké.

| # | Oblast | Povinnost | Stav | Riziko | Vlastník | Deadline | Zdroj |
|---|---|---|---|---|---|---|---|
| C-01 | GDPR — informační povinnost | Privacy Policy odpovídající realitě (čl. 13/14) | 🔴 stávající `/gdpr` uvádí neexistující subprocesory a AI; návrh náhrady hotov (`02`) | 🔴 | O+A | před launchem | [GDPR, CELEX 32016R0679](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:32016R0679) |
| C-02 | DPA čl. 28 | Zpracovatelská smlouva + akceptace firmou | návrh hotov (`03`); akceptační checkbox chybí (G-07) | 🟠 | V+A | před launchem | GDPR čl. 28 |
| C-03 | Cookies | Opt-in pro ne-nezbytné; pravdivý banner | banner slibuje GA/Plausible, které neběží (G-02) | 🟠 | V | před launchem | [§ 89/3 ZEK](https://www.zakonyprolidi.cz/cs/2005-127), [ÚOOÚ](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies) |
| C-04 | Data retention | Definované doby + skutečné mazání | návrh (`05`); hodnoty F7/F8 nepotvrzené, purge joby chybí (G-09) | 🟠 | O+V | před platícími zákazníky | GDPR čl. 5/1 e) |
| C-05 | Incident response | Postup čl. 33/34 + kontakt | neformalizováno (F6, G-12) | 🟠 | O | před platícími zákazníky | GDPR čl. 33–34 |
| C-06 | Account deletion | In-app + web postup | ✅ implementováno (`DELETE /me`, `/smazani-uctu`) — nasadit (G-03) | 🟢 | V | s mobilním releasem | [Apple 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/), [Play](https://support.google.com/googleplay/android-developer/answer/13327111) |
| C-07 | Obchodní podmínky | Aktuální OP (trial, Stripe, změny cen, limitace) | stávající `/podminky` neúplné; návrh hotov (`01`) | 🟠 | A | před launchem | [OZ 89/2012](https://www.zakonyprolidi.cz/cs/2012-89) § 1751–1752 |
| C-08 | Promo/referral | Podmínky kampaní + evidence | V1 jen eviduje; podmínky až s reálnou odměnou (F11) | 🟢 | O | s první kampaní | OZ; nekalé praktiky 634/1992 |
| C-09 | B2B/B2C hranice | Rozhodnout + ošetřit spotřebitele | nerozhodnuto (F4); návrh v OP § 3+13 | 🟠 | O+A | před launchem | OZ § 1829, § 1837 l) |
| C-10 | E-mail marketing | Souhlas/soft opt-in + unsubscribe | nic neexistuje — dnes se nesmí posílat (G-06) | 🟢 (dokud se neposílá) | V | s prvním newsletterem | [480/2004 § 7](https://www.zakonyprolidi.cz/cs/2004-480) |
| C-11 | Účetní/daňová upozornění | „Nejsme daňový poradce" + odpovědnost za doklady | v návrhu OP § 2.3, 11.3 | 🟢 | A | launch | — |
| C-12 | Export dat | Reálná možnost exportu před výmazem | dílčí exporty ✅; kompletní export chybí (G-04) | 🟠 | V | před platícími zákazníky | GDPR čl. 20 |
| C-13 | App Store Privacy | Nutrition labels dle reality | připraveno v `11` (žádný tracking) | 🟢 | O | při submitu | [Apple privacy details](https://developer.apple.com/app-store/app-privacy-details/) |
| C-14 | Play Data Safety | Formulář dle reality | `docs/release/DATA_SAFETY.md` ✅ + `11` | 🟢 | O | při submitu | [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469) |
| C-15 | Apple Sign In | Povinný při 3rd-party loginu | ✅ nativní implementace | 🟢 | — | hotovo | [Guideline 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services) |
| C-16 | Google OAuth | Verifikace consent screen, scopes minimální | jen e-mail/profil; consent screen nutno zveřejnit (operátor) | 🟢 | O | před releasem | Google OAuth policies |
| C-17 | Subprocesoři | Pravdivý veřejný seznam + notifikace změn | 🔴 dnes nepravdivý (G-01); šablona v `02`/`03` | 🔴 | O | před launchem | GDPR čl. 28/2 |
| C-18 | AI/MCP | Podmínky až s reálnou funkcí; smazat AI zmínku z `/gdpr` | návrh v šuplíku (`07`); G-01 | 🟢 | V | s první AI funkcí | [AI Act, CELEX 32024R1689](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:32024R1689) čl. 50 |
| C-19 | Podpisy | Nepřehánět právní účinky; dodatky s providerem | zásady v `08`; UI texty zkontrolovat (G-13) | 🟠 | V+A | před spuštěním modulu naostro | [eIDAS, CELEX 32014R0910](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:32014R0910) |
| C-20 | Platby | Oddělení od Stripe; žádná karta v systému | ✅ architektura; ověřit model úhrad faktur (F2) | 🟠 | O+A | před online úhradami faktur | zák. 370/2017 Sb. |
| C-21 | Kyberzákon (NIS2) | Samoidentifikace regulované služby | neprovedeno (F15) — očekávaně pod prahy, ale doložit | 🟠 | O | co nejdřív (zákon účinný od 1. 11. 2025) | [264/2025 Sb.](https://www.zakonyprolidi.cz/cs/2025-264), [NÚKIB](https://portal.nukib.gov.cz) |
| C-22 | Smlouvy s dodavateli | DPA/SCC s VPS, SMTP, Stripe, (Sentry) | nedoloženo (F1) | 🟠 | O | před launchem | GDPR čl. 28/44+ |
| C-23 | Transfery mimo EHP | Jen s DPF/SCC; zdokumentovat | závisí na F1/F2; DPF pro Stripe/Sentry/Google/Apple | 🟠 | O+A | před launchem | [Rozhodnutí (EU) 2023/1795](https://eur-lex.europa.eu/eli/dec_impl/2023/1795/oj) |
| C-24 | Bezpečnostní kontakt | security@ + proces hlášení | chybí (F6) | 🟢 | O | před launchem | best practice; NIS2 čl. 23 analogicky |
| C-25 | Záznamy o činnostech zpracování (čl. 30) | Interní ROPA dokument | lze odvodit z `02`/`03` — sepsat | 🟢 | O+A | před platícími zákazníky | GDPR čl. 30 |
| C-26 | DSA (hosting veřejných objednávek/menu) | Kontaktní místo, podmínky pro user content | okrajové; posoudit | 🟢 | A | právní review | [DSA, CELEX 32022R2065](https://eur-lex.europa.eu/legal-content/CS/TXT/?uri=CELEX:32022R2065) |
| C-27 | Právní review | Advokátní kontrola celého balíčku | ne | 🔴 | O+A | před zveřejněním | — |
