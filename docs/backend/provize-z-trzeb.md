# Backend zadání: Provize z tržeb (modul Směny & provize)

Frontend je hotový a nasazený. Provize se počítají a zobrazují na `/app/smeny`
(sekce „Provize z tržeb"), ale zůstávají **prázdné, dokud backend nedodá napojení prodeje na
zaměstnance**. Níže přesně, co doplnit. FE se po nasazení přepne bez dalšího zásahu.

---

## 1. `Sale.employeeId` (klíčové)

Přidat na entitu **Sale** (prodej) pole:

- `employeeId: string | null` — kdo prodej uskutečnil (FK na `Employee.id`).

Musí být:

- **vrácené** v `GET /sales` a `GET /sales/{id}` (v paged obálce `{items,total,page,pageSize}`),
- **přijímané** v `POST /sales` (viz bod 2).

Frontend typ už s tím počítá (`Sale.employeeId` v `src/lib/types.ts`).

## 2. Jak se `employeeId` nastaví při prodeji

Produktové rozhodnutí — kdo je „prodávající"? Vyber jednu:

- **Varianta A (doporučeno pro sdílený POS terminál):** `POST /sales` přijme `employeeId` v těle.
  Číšník/prodavač si vybere sebe. → Pak na FE doplním do Pokladny výběr „Prodávající" (udělám,
  jakmile endpoint přijímá employeeId).
- **Varianta B (per-login / píchačka):** backend přiřadí `employeeId` **automaticky** podle
  přihlášeného nebo aktuálně napíchnutého zaměstnance (`/attendance/current`). Bez zásahu do FE.

**Dej vědět, kterou volíš** — podle toho doladím (nebo nechám být) pokladnu.

## 3. Seznam zaměstnanců

FE už čte `GET /employees?pageSize=100` (přes `useAttendance`). Potvrď, že endpoint jede a vrací
`{id, fullName, ...}`. Provize matchuje `Sale.employeeId` → `Employee.id`, jméno z `Employee.fullName`.

## 4. Sazba provize (%)

Zatím FE bere sazbu z inputu na stránce (nepersistuje se — manažer si ji nastaví při pohledu).
Pokud chceš sazbu **uložit** (per firma / pobočka / zaměstnanec), přidej pole do profilu; FE pak
místo inputu načte uloženou hodnotu. **Volitelné, neblokuje.**

## 5. (Volitelně) serverová agregace

FE teď počítá provize klientsky: načte prodeje stránkováním (`listAll`, strop 5000 záznamů) +
zaměstnance a spočítá `calculateCommission`. U velkých objemů by pomohl
`GET /sales/summary?by=employee&from=&to=` → agregované tržby per `employeeId`. **Neblokuje.**

## 6. DŮLEŽITÉ — jak modeluješ vratky / dobropisy? (ověřit)

FE dnes zná jen `SaleStatus = "Completed" | "Cancelled"` — žádný refund status. Potřebuju vědět,
jak backend eviduje **vratku / dobropis prodeje**:

- jako `status: "Cancelled"` (pak se z provize vyloučí sama), **nebo**
- jako samostatný **záporný** `totalNet` prodej se `status: "Completed"`, **nebo**
- jako samostatnou refund entitu?

FE zatím pro jistotu **záporné `totalNet` z provize vylučuje** (aby vratka neudělala zápornou
provizi). Až potvrdíš model, doladíme, ať čísla sedí. **Pozn.:** stejná otázka se týká i
**Konsolidace poboček** (`consolidation.ts` taky sčítá `totalNet` dokončených prodejů) — ať se
tržby vykazují konzistentně.

---

## Kontrakt, který FE očekává (shrnutí výpočtu)

- `Sale.employeeId: string | null` v `GET`/`POST /sales`.
- **Provize** = Σ `totalNet` (čistá tržba bez DPH a spropitného) prodejů se `status: "Completed"`,
  daným `employeeId` a **nezáporným `totalNet`**, vynásobeno sazbou % (clampnutou na 0–100).
- **Nepočítá se:** storno (`status: "Cancelled"`), prodeje bez `employeeId` a záporné tržby.
- Řazení výstupu: podle provize sestupně.

Logika je zapouzdřená v `src/lib/shifts.ts → calculateCommission()` (+ unit testy tamtéž), takže
kontrakt je jednoznačný a otestovaný.
