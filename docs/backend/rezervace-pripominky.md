# Backend zadání: Připomínky rezervací (e-mail/SMS)

Cíl: automaticky připomenout zákazníkovi blížící se rezervaci → míň no-show. `Reservation` už má
`customerEmail` / `customerPhone` i stavy (`Pending`/`Confirmed`/`Completed`/`Cancelled`/`NoShow`).

**Frontend:** tenký — nastavení (které kanály, jak dlouho předem) + badge „⏰ odesláno" v seznamu.
Doplním, jakmile backend vrací stav připomínky. **Jádro je backend** (scheduler + brány).

## Co backend musí dodat

1. **Nastavení připomínek** (per firma, příp. per služba): které kanály (e-mail / SMS), kolik
   předem (např. 24 h a/nebo 2 h). Uložit + CRUD endpoint.
2. **Scheduler / background job** — periodicky najde rezervace v okně „za X" ve stavu
   `Confirmed` (nebo `Pending`) a pošle připomínku. Idempotentně (každou připomínku poslat 1×).
3. **Odeslání:**
   - **E-mail** — SMTP / SendGrid / Mailgun.
   - **SMS** — brána (Twilio mezinárodně, nebo česká **SMSbrána.cz** / GoSMS — levnější pro ČR).
4. **Stav připomínky na rezervaci** — vrátit v `GET /reservations` (např. `reminderSentAt` nebo
   `reminderStatus`), ať FE ukáže badge. + log pokusů (kdy, kanál, výsledek).

## Rozhodnutí pro tebe

- **SMS provider** (Twilio vs SMSbrána/GoSMS) — SMS stojí peníze, tak čí bránu a účet použijeme?
- **E-mail provider** (pozn.: transakční e-maily beztak budou potřeba i pro fakturace/reset hesla —
  vyřešit jednou centrálně).
- Připomínat i `Pending` (nepotvrzené), nebo jen `Confirmed`?
