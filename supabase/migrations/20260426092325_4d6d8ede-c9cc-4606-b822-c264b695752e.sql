-- Tabulka pro denní tracking AI dotazů
CREATE TABLE public.ai_usage_daily (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, usage_date)
);

CREATE INDEX idx_ai_usage_daily_user_date ON public.ai_usage_daily (user_id, usage_date);

ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;

-- Uživatel vidí svou vlastní spotřebu
CREATE POLICY "Users view own AI usage"
ON public.ai_usage_daily
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Zápis a změny pouze ze serveru (service_role)
CREATE POLICY "Service role manages AI usage"
ON public.ai_usage_daily
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Atomická funkce: zvýší počet a vrátí aktuální stav + zda byl překročen limit
CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  _user_id uuid,
  _daily_limit integer DEFAULT 100
)
RETURNS TABLE (
  current_count integer,
  daily_limit integer,
  limit_exceeded boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_count integer;
BEGIN
  INSERT INTO public.ai_usage_daily (user_id, usage_date, request_count)
  VALUES (_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.ai_usage_daily.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO _new_count;

  RETURN QUERY SELECT
    _new_count,
    _daily_limit,
    _new_count > _daily_limit;
END;
$$;