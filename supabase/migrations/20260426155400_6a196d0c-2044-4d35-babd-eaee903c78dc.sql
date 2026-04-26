-- Dočasně vypneme ochranný trigger, abychom mohli upravit chráněná pole.
ALTER TABLE public.profiles DISABLE TRIGGER USER;

UPDATE public.profiles
SET trial_ends_at = now() + interval '6 months'
WHERE id = '2f160a27-45f7-4bbe-a645-57bd58aff6d4';

ALTER TABLE public.profiles ENABLE TRIGGER USER;

INSERT INTO public.audit_logs (user_id, event_type, description, metadata)
VALUES (
  '2f160a27-45f7-4bbe-a645-57bd58aff6d4',
  'trial.extended',
  'Trial prodloužen o 6 měsíců (tester grant).',
  jsonb_build_object('extended_by_months', 6, 'reason', 'tester_grant', 'granted_by', 'admin')
);