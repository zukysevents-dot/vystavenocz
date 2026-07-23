# Persona E2E testy

Povinné persona-based rozšíření auditu: aplikace se prochází jako 8 skutečných uživatelů
(majitel, skladník, kadeřnice/služby, číšník, kuchař, manažer pobočky, účetní, nový uživatel)
v desktopovém i mobilním viewportu, výhradně přes UI proti reálnému API.

## Spuštění

Prostředí je stejné jako u `test:e2e:audit` (viz `e2e/audit/` a memory `backend-local-run`):

1. Postgres `vystaveno-dev-pg` (port 5434) + DB `vystaveno_e2e`, backend na 5176
   (`Database__ConnectionString=...Database=vystaveno_e2e...`), jednorázově `seed-demo`.
2. Frontend v API režimu: `VITE_API_URL=http://localhost:5176/api/v1 npm run dev -- --port 5173`.
3. Přihlašovací údaje POUZE z env / gitignorovaného `.env.e2e` (config ho načítá sám):
   `E2E_DEMO_EMAIL`, `E2E_DEMO_PASSWORD`, `E2E_PERSONA_PASSWORD` (libovolné silné heslo — účty se
   podle něj založí při prvním běhu), volitelně `E2E_API_URL`, `E2E_BASE_URL`.

```bash
npm run test:e2e:personas
```

## Jak to funguje

- `personas.setup.ts` idempotentně založí persona účty přes reálný pozvánkový flow
  (`POST /company/invitations` → `POST /invitations/{token}/accept`). Bez SMTP vrací create 503 až
  po commitu (nález N3 v reportu) — setup proto Pending pozvánce nastaví známý `token_hash` přímo
  v e2e DB (`docker exec … psql`, container/DB přes `E2E_PG_CONTAINER`/`E2E_PG_DB`).
- Každá persona má storageState v gitignorovaném `.auth/`; čerstvý (< 30 min) se recykluje kvůli
  rate limitu `/auth/login`.
- Fixture `watch` (fixtures.ts) v každém testu sbírá chyby konzole, spadlé requesty a 4xx/5xx a
  přikládá je do reportu; očekávané stavy povoluje `test.use({ allowStatus: [...] })`.
- Známé nálezy jsou v testech buď záměrně červené (P0 platba číšníka), nebo zdokumentované
  annotations typu `nález`.

Výsledky a klasifikace nálezů: `docs/testing/persona-audit-2026-07.md`.

## Bezpečnostní pravidla

- NIKDY nespouštět proti sdílenému staging/produkčnímu prostředí — setup zapisuje do DB a testy
  platí účty / vytvářejí doklady.
- Inventura, korekce a odpis se v testech NEPOTVRZUJÍ; skladové pohyby jen v páru +1/−1 ks.
- Hesla se nesmí objevit v kódu, reportech ani commitech.
