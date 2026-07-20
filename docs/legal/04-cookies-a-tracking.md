# Zásady cookies a sledování — NÁVRH k právnímu review

> Právní rámec: § 89 odst. 3 zákona č. 127/2005 Sb., o elektronických komunikacích (od 1. 1. 2022
> režim **opt-in** — novela č. 374/2021 Sb.) + GDPR pro navazující zpracování; výklad ÚOOÚ:
> [uoou.gov.cz — Cookies](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies).

## 1. Skutečný stav produktu (k 20. 7. 2026 — deklarovat jen tohle)

| Úložiště / SDK | Kategorie | Účel | Souhlas? |
|---|---|---|---|
| `vystaveno.auth.tokens.v1` + session (localStorage) | nezbytné | přihlášení (JWT + refresh) | ne — nezbytné pro službu vyžádanou uživatelem |
| `vystaveno.cookieConsent.v1` (localStorage) | nezbytné | uložení volby souhlasu | ne |
| provozní klíče aplikace (nastavení UI, mock data v demo režimu) | nezbytné/funkční | fungování aplikace | ne |
| Stripe cookies při platbě (checkout/portál Stripe) | nezbytné pro platbu | zpracování platby Stripe | řeší Stripe na svých doménách; zmínit v policy |
| Sentry (web) | funkční/diagnostické | hlášení chyb | `[POKUD JE DSN AKTIVNÍ — otázka F2]` — bez cookies, ale jde o předání údajů; uvést v policy |
| **Analytika (GA/Plausible)** | analytické | — | **ŽÁDNÁ SE NENAČÍTÁ** — `applyAnalyticsConsent` je no-op |
| Marketingové cookies | marketingové | — | **nepoužívají se** |
| Mobilní aplikace | — | žádné analytics/crash/tracking SDK | — |

**Nesoulad k opravě (mezera G-02):** cookie banner dnes tvrdí „Google Analytics & Plausible —
měření návštěvnosti", ale žádná analytika neexistuje. Banner buď (a) přepsat na pravdivý stav
(doporučeno pro launch — pak jde o čistě „nezbytné" a přepínač analytiky zmizí), nebo (b) analytiku
skutečně zapojit přes consent gate.

## 2. Text cookie policy (veřejná stránka)

**Cookies a podobné technologie ve Vystavenu**

Pro přihlášení a fungování aplikace ukládáme do vašeho prohlížeče nezbytné údaje (přihlašovací
token a technická nastavení). Bez nich služba nefunguje; souhlas se u nich nevyžaduje (§ 89 odst. 3
zákona o elektronických komunikacích — výjimka pro technicky nezbytné ukládání).

Analytické ani marketingové cookies **nepoužíváme**. Pokud je v budoucnu zapneme, stane se tak
až po vašem předchozím souhlasu v cookie liště a tento dokument aktualizujeme.

Při platbě předplatného vás přesměrujeme na Stripe, který na svých stránkách používá vlastní
nezbytné cookies pro zpracování platby (viz zásady Stripe).
`[Sentry odstavec — jen je-li aktivní: „Při chybě aplikace odešleme technické hlášení o chybě
(bez obsahu vašich dokladů) službě Sentry pro její opravu."]`

Volbu můžete kdykoli změnit v patičce webu („Nastavení cookies").

## 3. Banner a preference centrum

**Doporučený banner pro launch (bez analytiky):** jedna nenápadná lišta —
„Používáme jen nezbytné cookies pro přihlášení a bezpečnost. Žádné sledování. [Rozumím] [Více]".
Bez přepínačů — není k čemu dávat souhlas; nezobrazovat opt-in mechanismus tam, kde není potřeba.

**Až bude analytika reálná:** dvě rovnocenné volby („Přijmout analytiku" / „Odmítnout") + odkaz na
preference centrum; výchozí stav vypnuto; skripty se smí načíst až po souhlasu; souhlas
verzovaný a doložitelný (`decidedAt` už dnes banner ukládá — doplnit verzi textu); odvolání stejně
snadné jako udělení (patička → Nastavení cookies, event `CONSENT_RESET_EVENT` už existuje).

**Provozní obrazovky (Pokladna, Restaurace, Kuchyně):** banner se nezobrazuje, volba se odkládá
na první neprovozní obrazovku; do rozhodnutí je vše kromě nezbytného vypnuté (privacy-safe default).

## 4. Doporučení

1. Nepřidávat Google Analytics; pokud bude analytika potřeba, preferovat self-hosted/EU nástroj
   bez cookies (např. Plausible) — i tak jde o souhlasovou kategorii dle výkladu ÚOOÚ, pokud
   ukládá/čte identifikátory v zařízení; posoudit konkrétní konfiguraci. ⚖️
2. Žádné marketingové/reklamní SDK do webu ani mobilu.
3. Mobilní aplikace: držet nulový tracking — zjednodušuje App Store Privacy i Data Safety.
4. Jakoukoli změnu SDK promítnout současně sem, do store deklarací (`docs/legal/11`) a do bannerů.
