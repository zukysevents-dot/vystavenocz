# Podmínky pro podpisy a platební integrace — NÁVRH

> Skutečný stav k 20. 7. 2026: podpisový modul je **foundation bez ostrého providera** (BankID jen
> „připraveno k napojení"); platební terminálové brány (ČSOB, NFCTRON, Comgate, SumUp, GP webpay)
> jsou **katalogové cíle bez runtime adapteru**. Ostré platby dnes = pouze Stripe (předplatné +
> online úhrada faktury). Dodatky s konkrétními providery se dopisují **až po podpisu smluv**.

## 1. Ověřené podpisy (modul `verified_signing`)

### Co dnes systém dělá (a co smíme tvrdit)

- Vytváří **podpisové obálky**: dokument zůstává u uživatele, ukládá se jen jeho **otisk
  (SHA-256)**, údaje podepisující osoby a evidenční záznam událostí (kdy vytvořeno/odesláno/…).
- Odeslání k reálnému ověřenému podpisu proběhne **až přes napojeného poskytovatele**; dnes
  existuje jen testovací (mock) kanál. **Nikde netvrdit, že „ověřený podpis přes BankID funguje".**

### Právní rozlišení (eIDAS, nařízení (EU) č. 910/2014, čl. 3 a 25–26)

| Typ | Co to je | Kdy ho Vystaveno může zmínit |
|---|---|---|
| **Prostý elektronický podpis** | data připojená k dokumentu (i jméno v PDF) | ano — to, co evidence obálek podporuje už dnes |
| **Zaručený el. podpis** (čl. 26) | jednoznačná vazba na podepisujícího, detekce změn | jen s reálným providerem, který ho poskytuje |
| **Kvalifikovaný el. podpis** | zaručený + kvalifikovaný prostředek a certifikát; právní účinek vlastnoručního podpisu (čl. 25/2) | jen s kvalifikovaným poskytovatelem dle EU seznamu důvěryhodných služeb |

Podle čl. 25/1 eIDAS nesmí být el. podpisu upřen právní účinek jen proto, že je elektronický —
ale **konkrétní právní sílu určuje typ podpisu a kontext**. Proto v UI a marketingu nepoužívat
formulace „právně závazný podpis" bez upřesnění; správně: „evidence podpisu s otiskem dokumentu",
u budoucího BankID kanálu popsat přesně to, co provider smluvně garantuje. ⚖️

### Návrh podmínek modulu (aktivovat s prvním providerem)

(a) Podpisovou službu poskytuje `[PROVIDER — otázka F17]`; **Vystaveno je technická platforma**,
která předává dokumentová metadata a přijímá výsledek — samo podpis neposkytuje ani neověřuje
totožnost; (b) typ podpisu: `[dle smlouvy s providerem]`; (c) evidenční záznamy (otisk dokumentu,
časy, reference providera) uchováváme po dobu `[DOPLNIT]` jako důkazní podporu; provider vede
vlastní záznamy dle svých podmínek; (d) odpovědnost za dostupnost a soulad podpisové služby nese
provider v rozsahu svých podmínek; naše odpovědnost se řídí OP § 11; (e) přístupové klíče providera
ukládáme v šifrovaném trezoru a lze je kdykoli odvolat.

## 2. Platby

### Stripe (ostré už dnes)

- Předplatné Vystavena a volitelná online úhrada faktury zákazníkem uživatele běží přes **Stripe**
  (licencovaná platební instituce). **Vystaveno platební údaje karet nepřijímá, neukládá ani
  nezpracovává** — uživatel je zadává přímo Stripe. Vystaveno není poskytovatelem platebních
  služeb dle zákona č. 370/2017 Sb. ⚖️ *(potvrdit hranici — Vystaveno nesmí vstupovat do toku
  peněz; při online úhradě faktur jde platba na účet uživatele přes jeho vlastní Stripe? —
  `[OVĚŘIT MODEL: čí Stripe účet přijímá úhrady faktur — otázka F2]`)*

### POS „platba kartou"

- Tlačítko „kartou" v pokladně **pouze eviduje** platbu přijatou na vlastním terminálu obsluhy —
  žádné zpracování platby ve Vystavenu neprobíhá. Tak to popisovat i v store review notes (už je).

### Budoucí terminálové brány (ČSOB, NFCTRON, Comgate, SumUp, GP webpay)

- Dnes jen katalog „připraveno k napojení" + trezor credentialů; **žádné ostré strhávání plateb**.
  Pro každý ostrý adapter před spuštěním: smlouva uživatele s providerem (acquirer), dodatek
  podmínek s vymezením rolí (Vystaveno = technické rozhraní, provider = platební služba), PCI DSS
  dopad (očekávaně SAQ mimo Vystaveno — karty nesmí procházet naším serverem), aktualizace
  subprocesorů, incident postupy. ⚖️
