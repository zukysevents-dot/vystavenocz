-- Změna výchozí barvy faktury z tyrkysové (#0fbfb6) na decentní tmavě šedou (#1f2937).
-- Profesionálnější default; uživatelé si můžou vždy přebarvit v Nastavení.

ALTER TABLE public.profiles
  ALTER COLUMN invoice_color SET DEFAULT '#1f2937';

-- Existující uživatelé, kteří mají původní default (a tedy si barvu nikdy nezměnili),
-- dostanou nový default. Uživatele s vlastní barvou neměníme.
UPDATE public.profiles
SET invoice_color = '#1f2937'
WHERE invoice_color = '#0fbfb6';
