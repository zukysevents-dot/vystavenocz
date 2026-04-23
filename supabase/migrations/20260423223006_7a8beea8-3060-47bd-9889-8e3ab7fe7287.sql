-- Trigger to prevent users from modifying protected subscription/trial fields
CREATE OR REPLACE FUNCTION public.protect_profile_subscription_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role (used by webhooks, server-side admin) to change anything
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- For regular authenticated users: revert protected columns to their OLD values
  NEW.trial_ends_at := OLD.trial_ends_at;
  NEW.subscription_active := OLD.subscription_active;
  NEW.subscription_until := OLD.subscription_until;
  NEW.next_invoice_seq := OLD.next_invoice_seq;
  NEW.next_credit_note_seq := OLD.next_credit_note_seq;
  NEW.credit_note_prefix := OLD.credit_note_prefix;
  NEW.account_status := OLD.account_status;
  NEW.anonymized_at := OLD.anonymized_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_subscription_fields_trigger ON public.profiles;

CREATE TRIGGER protect_profile_subscription_fields_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_subscription_fields();