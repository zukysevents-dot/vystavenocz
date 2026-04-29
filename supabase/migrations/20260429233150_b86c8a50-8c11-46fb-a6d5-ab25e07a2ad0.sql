CREATE TABLE public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('invoice','reminder','thank_you')),
  level integer,
  recipient text NOT NULL,
  cc text,
  subject text NOT NULL,
  resend_id text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_send_log_invoice ON public.email_send_log (invoice_id, created_at DESC);
CREATE INDEX idx_email_send_log_user ON public.email_send_log (user_id, created_at DESC);

ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view email log of own invoices"
  ON public.email_send_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages email log"
  ON public.email_send_log
  FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');