# Chybějící fakta — otázky před zveřejněním právního balíčku

Stav k 20. 7. 2026. Dokumenty v `docs/legal/` jsou napsané podle **skutečného chování produktu**
(kód obou repozitářů + deploy dokumentace). Kde fakt nejde z kódu zjistit, je v dokumentech značka
`[DOPLNIT PŘED ZVEŘEJNĚNÍM]` a otázka tady. Nic z toho není právní rada — finální texty musí před
zveřejněním projít českým advokátem (IT/GDPR/obchodní právo).

## Co už je zjištěno z produktu (ověřit, ne vymýšlet)

| Fakt | Zdroj | Stav |
|---|---|---|
| Provozovatel: Patrik Zukal, IČO 24991686, Brodská 1914/40, 591 01 Žďár nad Sázavou, OSVČ, patrik@vystaveno.cz, neplátce DPH | stávající `/gdpr` a `/podminky` | **ověřit v ARES/RŽP, potvrdit aktuálnost** |
| Ceník: Vystaveno Pro 159 Kč/měs / 1 200 Kč/rok, trial 14 dní, Stripe, automatická obnova | `/podminky`, `src/lib/pricing.ts` | potvrdit, že platí pro launch |
| Architektura: jeden VPS, Docker (Caddy → nginx → ASP.NET API + PostgreSQL), soubory na lokálním volume `api_files` | `docs/deployment-vps.md`, `docker-compose*` | ✅ z kódu |
| E-mail: vlastní SMTP přes env (`EMAIL_HOST` …), odesílá faktury/nabídky/pozvánky/rezervace | backend `IEmailSender` | provider = otázka F1 |
| Web error tracking: Sentry (jen s `VITE_SENTRY_DSN`, `tracesSampleRate 0`, `event.extra` se maže) | `src/main.ts` | je DSN v produkci nastavené? → F2 |
| Analytika: **žádná** — `applyAnalyticsConsent` je no-op, GA/Plausible se nenačítá | `src/lib/analytics.ts` | ✅ z kódu (banner ale GA/Plausible slibuje → mezera G-02) |
| Mobil: žádné analytics/crash SDK, tokeny v Keychain/Keystore | `docs/release/DATA_SAFETY.md`, kód | ✅ z kódu |
| OAuth: Google + Apple, server-side flow, PKCE/state, redirect allowlist | `feat/mobile-oauth`, `web-identity.md` | ✅ z kódu |
| Smazání účtu: in-app `DELETE /api/v1/me` (anonymizace + archivace účetních dat), web `/smazani-uctu` | `docs/backend/account-deletion.md` | ✅ z kódu |
| Referral V1: kódy + evidence, **žádný automatický payout/měsíc zdarma** (`termsVersion: growth-referral-v1`) | `docs/backend/growth-referral-partner-v1.md` | ✅ z kódu |
| AI: modul `ai` existuje jen jako přepínač, **žádná reálná AI integrace v kódu** | grep obou repo | ✅ z kódu |
| Podpisy: foundation + trezor credentialů, BankID „připraveno k napojení", nic ostrého | `verified-signing` kód | ✅ z kódu |
| POS platby: `manual`/`mock`, žádná karta se neukládá; Stripe jen předplatné + online úhrada faktury | `PaymentTerminalService`, katalog | ✅ z kódu |
| Zálohy: na tomtéž VPS, min. 2 kompletní, týdenní restore-check; **off-site kopie zatím chybí** | `docs/vps-reliability.md` | ✅ z kódu |

## 1. Nutné pro právně použitelnou první verzi

- **F1 — Subprocesoři, skutečný seznam.** Stávající `/gdpr` uvádí Supabase, Cloudflare, Resend a
  Google AI — to **neodpovídá** reálné architektuře (vlastní VPS + Postgres + SMTP). Potvrďte:
  a) poskytovatel VPS (název, země, lokalita DC); b) SMTP provider produkce; c) je Sentry DSN
  v produkci aktivní, a pokud ano, region (EU/US)?; d) používá se Cloudflare/CDN před Caddy?
- **F2 — Stripe.** Který Stripe subjekt je smluvní stranou (Stripe Payments Europe Ltd.?) a používá
  se jen Checkout/Billing (karta nikdy neprojde Vystavenem)? Předpokládám ano — potvrdit.
- **F3 — Identita provozovatele.** Platí Patrik Zukal / IČO 24991686 / adresa / neplátce DPH i pro
  launch, nebo vznikne s.r.o.? (Mění celé hlavičky dokumentů.)
- **F4 — B2B/B2C.** Smí se registrovat spotřebitel? Produkt je určen podnikatelům; registrace to
  dnes nijak nevynucuje. Rozhodnutí: čistě B2B s prohlášením při registraci, nebo připustit
  spotřebitele (pak platí spotřebitelský režim v OP §13).
- **F5 — Podporované země.** Jen ČR? (UI je česky, doklady dle českého práva — dokumenty to tak
  předpokládají.)
- **F6 — Kontakt pro bezpečnostní hlášení a incident response.** Kdo přijímá hlášení
  (security@vystaveno.cz?), kdo rozhoduje o ohlášení ÚOOÚ do 72 h a jak se kontaktují firmy?
- **F7 — Retence provozních logů.** Serilog console → Docker; jaká je reálná rotace/retence logů
  na VPS? (Stávající `/gdpr` tvrdí 90 dnů — ověřit, nebo nastavit.)
- **F8 — Doba uchování záloh.** Skript drží „min. 2 kompletní zálohy" — jaká je cílová časová
  retence (dní/týdnů), aby šla napsat do retention policy a DPA?

## 2. Důležité před prvními platícími zákazníky

- **F9 — Refundace.** Politika vratek nad rámec zákona (poměrná vratka ročního tarifu při zrušení?
  žádná?). Dnes nikde nedefinováno.
- **F10 — Support.** Kanál (e-mail?), orientační reakční doba; žádné SLA se negarantuje — potvrdit,
  že to tak má zůstat.
- **F11 — Referral/promo odměny.** Jaká odměna reálně bude (měsíc zdarma?), limity, kdy se
  připisuje; V1 nic nepřipisuje — kampaňové podmínky podle toho.
- **F12 — DPO.** Povinnost jmenovat dle čl. 37 GDPR u tohoto rozsahu pravděpodobně nevzniká
  (posoudí advokát); chcete přesto dobrovolně určit kontaktní osobu pro privacy?
- **F13 — Pojištění profesní odpovědnosti** — existuje? (Ovlivňuje, jak tvrdě lze psát limitaci
  odpovědnosti.)
- **F14 — Mimosoudní řešení sporů (B2C).** Pokud padne rozhodnutí připustit spotřebitele, doplnit
  ADR/ČOI informaci (v návrhu OP už je).
- **F15 — Kyberzákon 264/2025 Sb.** Provést a zdokumentovat samoidentifikaci (viz matice C-21) —
  výsledek (pravděpodobně „neregulovaná služba" pod prahy) založit písemně.

## 3. Lze doplnit později

- **F16 — AI provider** (až bude reálná AI funkce; do té doby AI terms leží v šuplíku).
- **F17 — Podpisový provider** (BankID/jiný) — smluvní podmínky a wording až po podpisu smlouvy
  s providerem.
- **F18 — Platební terminálové brány** (ČSOB/NFCTRON/Comgate/SumUp/GP) — dodatky až po ostrém adapteru.
- **F19 — Off-site záloha** (dokumentace ji sama označuje za chybějící) — po zřízení doplnit do
  bezpečnostní přílohy.
- **F20 — Analytika.** Pokud se někdy zapne GA/Plausible, projít znovu cookie policy + banner
  (dnes je analytika vypnutá a banner to má říkat pravdivě).
- **F21 — Zvláštní kategorie údajů v přílohách.** Přílohy zakázek (PDF/foto) mohou obsahovat cokoli;
  dokumenty to řeší jako odpovědnost správce-Uživatele. Zvážit produktové varování při uploadu.
