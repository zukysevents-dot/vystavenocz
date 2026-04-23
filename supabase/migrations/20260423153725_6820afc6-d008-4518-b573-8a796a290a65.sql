ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_send_invoice_email boolean NOT NULL DEFAULT false;