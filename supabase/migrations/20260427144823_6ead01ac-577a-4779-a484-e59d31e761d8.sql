ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_reminder_sent_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_reminder_lookup
ON public.profiles (trial_ends_at)
WHERE trial_reminder_sent_at IS NULL AND subscription_active = false;