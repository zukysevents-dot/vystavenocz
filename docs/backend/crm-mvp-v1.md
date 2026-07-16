# CRM MVP V1 — klient, historie a další krok

**Roadmap bod:** `INV-08`  
**Stav:** implementační kontrakt pro `vystaveno-api`; neimplementováno  
**Princip:** CRM je vrstva nad existujícími klienty, nabídkami, zakázkami a fakturami — ne třetí adresář kontaktů.

## Cíl

Majitel malého podniku potřebuje na jednom místě vidět, co se s klientem dělo a co má udělat dál. V1 proto přidá k existujícímu `Client` ručně psané poznámky, úkoly a serverem odvozenou časovou osu dokladů. Nabídky, zakázky, rezervace, faktury a pohledávky zůstávají vlastníky své domény a CRM je pouze čte a propojuje.

V1 neobsahuje e-mailový marketing, automatické sekvence, lead scoring, duplicitu dealů, samostatný sales pipeline ani novou identitu zákazníka. Neodesílá e-mail ani SMS a netvrdí automatizaci, která neexistuje.

## Uživatelský tok

1. Uživatel otevře existujícího klienta a okamžitě vidí poslední aktivitu, otevřené úkoly, splatné pohledávky a vazby na nabídky/zakázky/faktury.
2. Přidá interní poznámku nebo úkol s termínem a prioritou.
3. Úkol dokončí přímo z detailu nebo z globálního seznamu „Dnes a po termínu“.
4. Časová osa řadí systémové události i ruční zápisy, ale systémové položky zůstávají neměnné a odkazují na původní doklad.
5. Filtr klientů ukáže například „má otevřený úkol“, „po termínu“, „má pohledávku“ nebo „bez dalšího kroku“.

## Datový model

```text
CrmActivity
  id, companyId, clientId, kind(Note|Call|Email|Meeting|TaskCreated|TaskCompleted|System)
  occurredAt, body?, sourceType?, sourceId?, createdBy, createdAt

CrmTask
  id, companyId, clientId, title, description?, dueAt?
  priority(Low|Normal|High), status(Open|Completed|Cancelled)
  completedAt?, completedBy?, createdBy, createdAt, updatedAt
```

`CrmActivity` s `kind=System` se nevytváří duplicitním zápisem dat z faktury. Timeline ho skládá při čtení ze zdrojových entit a nese `sourceType/sourceId` a bezpečný deep link. Ruční poznámka/call/meeting je append-only; oprava vytvoří novou verzi nebo auditovanou editaci podle stávajícího auditního vzoru. `CrmTask` je samostatně měnitelný stavový objekt a při vytvoření/dokončení vloží odpovídající activity.

Každá řádka je tenantová přes `companyId`; `clientId` je cizí klíč na existující klientský adresář. Smazání klienta buď musí být blokováno při existující historii, nebo provést auditovaný anonymizační/archivační tok — nikdy tichý cascade delete.

## API V1

Přesné capability mapování ponechat na existujícím modelu, který dodá Standa. API nepřidává vlastní role.

| Metoda | Endpoint | Účel |
| --- | --- | --- |
| `GET` | `/api/v1/crm/clients` | stránkovaný seznam existujících klientů s CRM souhrnem a filtry |
| `GET` | `/api/v1/crm/clients/{clientId}` | detail: klient, otevřené úkoly, pohledávky a odkazy na zdrojové entity |
| `GET` | `/api/v1/crm/clients/{clientId}/timeline` | cursor stránkovaná spojovaná časová osa |
| `POST` | `/api/v1/crm/clients/{clientId}/activities` | ruční poznámka/call/e-mail/meeting, s idempotency klíčem |
| `GET/POST` | `/api/v1/crm/tasks` | globální výběr a vytvoření úkolu |
| `PUT` | `/api/v1/crm/tasks/{taskId}` | změna textu/termínu/priorit otevřeného úkolu |
| `POST` | `/api/v1/crm/tasks/{taskId}/complete` | idempotentní dokončení |
| `POST` | `/api/v1/crm/tasks/{taskId}/cancel` | auditované zrušení |

`GET /crm/clients` přijímá `q`, `hasOpenTask`, `overdueTask`, `hasOutstandingBalance`, `noNextStep`, `sort`, `cursor` a `pageSize`. Server vrací `nextTaskDueAt`, `openTaskCount`, `lastActivityAt`, `outstandingAmount` a její měnu, ne předpočítanou směs více měn. `noNextStep` znamená, že klient nemá otevřený CRM úkol; není to odhad obchodní pravděpodobnosti.

Timeline má stabilní cursor řazený `occurredAt DESC, stableId DESC`. Systémová událost nese minimálně `sourceType`, `sourceId`, label a deep link; klient si nikdy nevymýšlí finanční stav nebo text dokladu.

## Konzistence a bezpečnost

- při vytvoření poznámky/úkolu se kontroluje, že klient patří aktivní firmě a případnému povolenému pobočkovému scope;
- každé `POST` používá idempotency klíč; stejný klíč se změněným payloadem vrací `409`;
- doklady a zakázky se připojují přes serverové query v tenant/scope filtru, ne přes klientská ID z URL;
- poznámky jsou interní: nikdy se nesmí objevit ve veřejné klientské zóně, PDF faktuře ani e-mailu;
- fulltext hledání, export i audit nesmí zbytečně kopírovat DIČ, adresu nebo citlivé poznámky;
- smazaná/archivovaná zdrojová entita zůstane v historii s pravdivým štítkem „historická položka“, ne rozbitým odkazem.

## Akceptace

- klient se stejným IČO/e-mailem nezíská nový CRM záznam; používá se současný `Client`;
- timeline složí fakturu, nabídku, zakázku a ruční poznámku ve správném pořadí bez duplikátů;
- vytvoření/dokončení úkolu je bezpečné při retry a přidá auditovatelnou položku;
- filtr po termínu a bez dalšího kroku funguje na serveru i pro stránkovaný seznam;
- součty pohledávek jsou oddělené podle měny a pocházejí z autoritativní fakturační domény;
- tenantový/pobočkový scope, audit a 403/404 chování pokrývají integrační testy;
- mobilní web zobrazí detail, timeline a dokončení úkolu bez horizontálního overflow.

## Další řez

Po API lze dodat mobilní detail klienta s timeline, formulář dalšího kroku a globální frontu úkolů. Automatizace, e-mailové kampaně, pipeline a scoring se posuzují až nad reálnými aktivitami; nesmí zdržet tento základ.
