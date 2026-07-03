# Backend zadání: Role & oprávnění (vynucení)

**Frontend hotový** (Vlna A) — skrývá manažerské stránky (Konsolidace, Pobočky) a finanční
položky (Přehled, Faktury, Klienti) pro roli `Employee` a má guard v routeru. **Ale FE gating je
jen UX vrstva a je fail-open** (při neznámé roli neblokuje). Skutečnou ochranu musí dělat backend.

## Role

`Owner` / `Manager` / `Employee` (FE už tyhle hodnoty čte z `/me`).

## Co backend musí zajistit

1. **`GET /me` vrací `role` a `locationId`** (pro Managera scoping na jeho pobočku). Potvrď, že
   `role` vrací spolehlivě (FE na tom staví skrývání i guard).
2. **Autorizace na endpointech (403 pro nedostatečnou roli):**
   - `Employee`: NEMÁ přístup k `invoices` (read i write), `clients`, konsolidaci/tržbám napříč
     pobočkami. (FE mu je skrývá, ale kdyby endpoint zavolal přímo, musí dostat 403.)
   - `Manager`: vidí data **jen své pobočky** — `GET /sales`, `GET /locations` filtrované podle
     jeho `locationId`. Nemá firemní nastavení (to jen `Owner`).
   - `Owner`: plný přístup.
3. **Nikdy nespoléhat na FE gating** — je obejitelný (fail-open). Backend = jediný závazný gate.

## Otázka pro tebe

- Vrací už `/me` `role` i `locationId`? Pokud ne, doplnit — jinak FE gating jede „naslepo"
  (fail-open = pustí každého).
