# Právní a privacy balíček Vystaveno — index

Návrhy k 20. 7. 2026, psané podle **skutečného chování produktu**. Žádný dokument není právní
rada; před zveřejněním je nutné advokátní review (viz postup níže).

| Soubor | Obsah | Zveřejnit |
|---|---|---|
| `00-chybejici-fakta.md` | otázky F1–F21 (co doplnit, rozdělené dle naléhavosti) | interní |
| `01-obchodni-podminky.md` | OP SaaS (trial, Stripe, promo, limitace, spotřebitel) | po F1–F4 + review |
| `02-zasady-ochrany-osobnich-udaju.md` | Privacy Policy (správce/zpracovatel) — náhrada `/gdpr` | po F1–F2 + review |
| `03-zpracovatelska-smlouva-dpa.md` | DPA čl. 28 + 4 přílohy | po F1 + review |
| `04-cookies-a-tracking.md` | cookie policy + pravdivý banner + preference | banner hned (G-02), policy po review |
| `05-retention-a-mazani-uctu.md` | retenční tabulky + proces smazání účtu | po F7–F8 + review |
| `06-bezpecnostni-priloha.md` | veřejná TOM příloha (jen ověřená opatření) | téměř hned (po F6) |
| `07-ai-mcp-podminky.md` | AI terms „do šuplíku" — NEzveřejňovat (žádná AI neexistuje) | s první AI funkcí |
| `08-podpisy-a-platby.md` | eIDAS rozlišení, Stripe/POS hranice, budoucí provideri | interní; dodatky až se smlouvami |
| `09-compliance-matice.md` | 27 oblastí, stav, riziko, vlastník, zdroj | interní |
| `10-implementacni-mezery.md` | G-01…G-17 s prioritami + P0 blocker list | interní |
| `11-store-deklarace-a-ui-texty.md` | Data Safety / App Privacy odpovědi, checkboxy, privacy centrum, deletion screen | při submitu |
| `12-pravni-zdroje.md` | primární zdroje s odkazy | interní |

## Co může ven ihned (bez doplnění firemních údajů)

- pravdivý cookie banner (G-02 — jde jen o odstranění nepravdivého slibu analytiky),
- bezpečnostní příloha po doplnění security kontaktu (F6),
- UI texty smazání účtu a review notes (`11`).

## Co až po doplnění údajů a review

- OP, Privacy Policy, DPA, retention policy — blokováno F1–F8 a advokátem (C-27).
- Cokoli o AI, BankID podpisech a terminálových platbách — až s reálnou funkcí/smlouvou.

## Doporučený postup právního review

1. Operátor vyplní F1–F8 (identita, subprocesoři, retence, kontakty) přímo do dokumentů.
2. Advokát (IT/GDPR/obchodní právo) dostane: `01`–`06` + `09` + `10`; požádat o kontrolu míst ⚖️,
   zvlášť: limitace odpovědnosti (OP § 11), změny podmínek (§ 15), spotřebitelský režim (§ 13/F4),
   audit v DPA, retence, kyberzákon samoidentifikaci (C-21) a DSA okraj (C-26).
3. Zapracovat, nasadit současně: `/podminky`, `/gdpr` (nový obsah + kotva #dpa), cookie banner,
   registraci s checkboxy (G-05).
4. Teprve poté store submity (deklarace z `11`).
5. Při každé změně SDK/subprocesora/funkce: aktualizace `02`+`04`+`11` v jednom PR (pravidlo v `11` § 6).
