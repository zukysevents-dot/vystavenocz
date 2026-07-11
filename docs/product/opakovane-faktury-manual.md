# Opakované faktury — uživatelský manuál

Jednoduchý průvodce pro pravidelnou fakturaci (měsíční paušály, předplatné, správa, hosting…). Cíl: nastavit fakturu **jednou** a systém ji vytvoří ve správný den sám — **bez duplicit**. Ceny i DPH počítá systém.

## Kde to najdu

Menu **`Opakované faktury`** (v sekci fakturace, vedle `Faktury`). Vidí ho vedení a účetní; obsluha (`Employee`) ne. Vyžaduje zapnutý modul **Fakturace**.

## 1. Nová šablona

1. `Opakované faktury` → **`Nová šablona`**.
2. Vyplňte:
   - **Název** (např. „Měsíční paušál — správa webu") — pro vaši orientaci.
   - **Odběratel** — klient z adresáře (nutný; můžete rovnou založit tlačítkem `Nový`).
   - **Den v měsíci** (1–31) — kdy se má faktura každý měsíc vytvořit. Když má měsíc míň dní (např. zadáte 31.), použije se **poslední den měsíce** (v únoru 28./29.).
   - **Splatnost (dní)** — kolik dní od vystavení.
   - **Automaticky vystavit** — viz níže. Necháte-li vypnuté (doporučeno), vzniká **koncept ke kontrole**.
   - **Položky** — co se fakturuje (popis, množství, cena **bez DPH**, sazba DPH). DPH a součty dopočítá systém.
3. Uložte. Šablona je **Aktivní** a v seznamu vidíte **datum dalšího běhu**.

## 2. Koncept vs. automatické vystavení (bezpečný režim)

- **Koncept (výchozí, doporučené):** systém ve správný den vytvoří **rozpracovanou fakturu**. Vy ji zkontrolujete a ručně vystavíte (a případně odešlete). Nic se nevystaví bez vaší kontroly.
- **Automaticky vystavit:** faktura se rovnou vystaví (dostane číslo z řady). Zapněte jen u šablon, kterým plně důvěřujete.

> Systém **neposílá** faktury e-mailem sám a **nestrhává** platby — to zůstává na vás (přes běžné odeslání faktury).

## 3. Přehled a stav dalšího běhu

V seznamu u každé šablony vidíte: odběratele, **datum dalšího běhu**, režim (Koncept / Auto-vystavení) a stav (**Aktivní** / **Pozastavená**).

## 4. Pozastavit / obnovit

- **Pozastavit** — šablona přestane generovat (např. klient dočasně pozastavil službu). Nic nemažete.
- **Obnovit** — spustí se znovu. Pokud datum běhu mezitím propadlo, posune se na nejbližší budoucí termín — **nevygeneruje se dávka zpětných faktur**.

## 5. Vygenerovat teď

Tlačítko **`Vygenerovat teď`** (blesk) vytvoří fakturu okamžitě, aniž byste čekali na termín — hodí se, když chcete klienta vyfakturovat mimo pořadí. Vznikne koncept (nebo rovnou vystavená faktura u auto-vystavení) a nabídne se odkaz **`Otevřít doklad`**. Za stejné období systém **nevytvoří druhou fakturu** — i kdyby ve stejnou chvíli běžel i automat.

## 6. Vytvořené doklady

V detailu šablony (klik na název) je seznam **Vytvořené doklady** — každý běh s obdobím a odkazem na fakturu. Odtud se dostanete přímo do dokladu.

## 7. Úprava a smazání

- **Upravit** (klik na název) — změníte položky, den, splatnost, režim. Změna dne posune další běh do budoucna (nikdy zpět).
- **Smazat** — šablona se archivuje a přestane generovat. **Už vytvořené faktury zůstávají** beze změny.

## Časté dotazy

- **Vytvoří se faktura dvakrát?** Ne. Za jedno období (měsíc) vznikne ze šablony vždy **jen jedna** faktura, i kdyby se generování spustilo víckrát.
- **Co když je klient plátce/neplátce DPH?** DPH se počítá stejně jako u běžných faktur podle nastavení vaší firmy.
- **Můžu měnit ceny?** Ano, v šabloně. Změna se projeví u **příštích** faktur; už vytvořené doklady se nemění.
