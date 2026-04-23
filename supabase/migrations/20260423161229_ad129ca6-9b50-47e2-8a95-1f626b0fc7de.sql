ALTER TABLE public.profiles
ADD COLUMN invoice_sender_local_part text DEFAULT 'faktury'::text;

COMMENT ON COLUMN public.profiles.invoice_sender_local_part IS 'Local part (before @) of the From address for invoice emails. Domain is always vystaveno.cz.';