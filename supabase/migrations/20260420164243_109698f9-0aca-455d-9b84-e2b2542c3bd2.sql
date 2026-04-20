-- Prevent duplicate invoice numbers per user
CREATE UNIQUE INDEX IF NOT EXISTS invoices_user_number_unique
  ON public.invoices (user_id, invoice_number);