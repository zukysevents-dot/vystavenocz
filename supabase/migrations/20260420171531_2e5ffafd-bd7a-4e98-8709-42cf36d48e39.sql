-- 1) Enum pro typ dokladu
CREATE TYPE public.document_type AS ENUM ('invoice', 'credit_note');

-- 2) Sloupce v invoices: typ dokladu + vazba na původní fakturu (u dobropisu)
ALTER TABLE public.invoices
  ADD COLUMN document_type public.document_type NOT NULL DEFAULT 'invoice',
  ADD COLUMN original_invoice_id uuid NULL REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_original_invoice_id ON public.invoices(original_invoice_id);
CREATE INDEX idx_invoices_document_type ON public.invoices(document_type);

-- 3) Vlastní řada čísel pro dobropisy v profiles
ALTER TABLE public.profiles
  ADD COLUMN credit_note_prefix text NOT NULL DEFAULT 'OD',
  ADD COLUMN next_credit_note_seq integer NOT NULL DEFAULT 1;