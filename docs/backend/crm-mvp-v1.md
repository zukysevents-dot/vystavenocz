# CRM MVP V1 — kontrakt pro frontend

CRM je interní nadstavba existujících klientů. V UI je dostupné na `/app/crm` pro Owner, Admin a Manager s modulem `invoicing`. Nezobrazuje se pracovníkům ani účetním a nikdy se nepřenáší do klientské zóny.

## API

- `GET /crm/clients?q=&overdueTask=` — klienti s počtem otevřených úkolů a dalším termínem.
- `GET /crm/clients/{clientId}/timeline` — interní časová osa.
- `GET /crm/tasks?overdue=` — otevřené úkoly firmy.
- `POST /crm/clients/{clientId}/activities` — ruční aktivita `{ kind, body }`.
- `POST /crm/tasks` — nový úkol `{ clientId, title, description, dueAt, priority }`.
- `POST /crm/tasks/{taskId}/complete` a `/cancel` — uzavření úkolu.

Zápis aktivity i úkolu musí vždy poslat unikátní hlavičku `Idempotency-Key`; `useCrm()` ji vytváří automaticky. Povolené ruční druhy aktivity: `Note`, `Call`, `Email`, `Meeting`. Systémové `TaskCreated`, `TaskCompleted`, `TaskCancelled` se vytvářejí jen API a slouží pro časovou osu.

## UX pravidla

- Tělo aktivity je interní poznámka: v UI ho neoznačovat jako zprávu klientovi ani ho nepublikovat do portálu.
- Časy API jsou UTC; UI je zobrazuje v lokálním formátu uživatele.
- Klienta s CRM historií nelze odstranit — UI má nabídnout archivaci v adresáři klientů.
- `409` při opakovaném nebo konfliktním zápisu má zobrazit srozumitelnou chybu a nesmí vytvořit lokální duplicitní záznam.
