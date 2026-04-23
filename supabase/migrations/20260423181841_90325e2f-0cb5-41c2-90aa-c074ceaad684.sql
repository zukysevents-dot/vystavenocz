
-- 1) Audit logs tabulka
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  description text,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user_created ON public.audit_logs(user_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Uživatel vidí jen svoje záznamy
CREATE POLICY "Users view own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role spravuje (žádné INSERT z klienta — vše přes SECURITY DEFINER fci)
CREATE POLICY "Service role manages audit logs"
ON public.audit_logs
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 2) Helper funkce pro zápis audit eventů (volatelná z autentizovaných session)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _event_type text,
  _description text DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'log_audit_event requires authenticated user';
  END IF;

  INSERT INTO public.audit_logs (user_id, event_type, description, ip_address, metadata)
  VALUES (_uid, _event_type, _description, _ip_address, COALESCE(_metadata, '{}'::jsonb))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(text, text, text, jsonb) TO authenticated;

-- 3) Stav účtu + datum anonymizace
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active', 'anonymized')),
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz;

-- 4) Anonymizační funkce
CREATE OR REPLACE FUNCTION public.anonymize_account(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _placeholder jsonb := jsonb_build_object(
    'name', '[Anonymizováno na žádost uživatele]',
    'company_name', '[Anonymizováno]',
    'full_name', '[Anonymizováno]',
    'street', NULL, 'city', NULL, 'zip', NULL, 'country', 'CZ',
    'ico', NULL, 'dic', NULL,
    'bank_account', NULL, 'iban', NULL, 'swift', NULL,
    'logo_url', NULL,
    'vat_mode', 'non_payer'
  );
BEGIN
  -- Bezpečnostní kontrola — uživatel může anonymizovat pouze sebe
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Cannot anonymize another user account';
  END IF;

  -- Smaže všechny klienty (nejsou potřeba pro účetní archivaci)
  DELETE FROM public.clients WHERE user_id = _user_id;

  -- Přepíše snapshoty na fakturách (zachová částky, čísla, data — kvůli archivaci)
  UPDATE public.invoices
     SET supplier_snapshot = _placeholder,
         client_snapshot = _placeholder,
         notes = NULL,
         internal_notes = NULL
   WHERE user_id = _user_id;

  -- Vyprázdní osobní pole na profilu, označí jako anonymizovaný
  UPDATE public.profiles
     SET full_name = NULL,
         company_name = NULL,
         ico = NULL,
         dic = NULL,
         street = NULL,
         city = NULL,
         zip = NULL,
         bank_account = NULL,
         iban = NULL,
         swift = NULL,
         logo_url = NULL,
         account_status = 'anonymized',
         anonymized_at = now(),
         updated_at = now()
   WHERE id = _user_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, event_type, description)
  VALUES (_user_id, 'account.anonymized', 'Účet byl anonymizován na žádost uživatele (GDPR čl. 17).');
END;
$$;

GRANT EXECUTE ON FUNCTION public.anonymize_account(uuid) TO authenticated;
