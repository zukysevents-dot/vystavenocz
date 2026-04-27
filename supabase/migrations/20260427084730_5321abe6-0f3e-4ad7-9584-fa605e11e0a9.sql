ALTER TABLE public.profiles ALTER COLUMN invoice_color SET DEFAULT '#1f2937';
UPDATE public.profiles SET invoice_color = '#1f2937' WHERE invoice_color = '#0fbfb6';