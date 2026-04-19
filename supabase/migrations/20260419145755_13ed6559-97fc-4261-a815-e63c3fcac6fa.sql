-- ===== ENUMS =====
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.vat_mode AS ENUM ('payer', 'identified', 'non_payer');

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company_name TEXT,
  ico TEXT,
  dic TEXT,
  vat_mode public.vat_mode NOT NULL DEFAULT 'non_payer',
  street TEXT,
  city TEXT,
  zip TEXT,
  country TEXT NOT NULL DEFAULT 'CZ',
  bank_account TEXT,
  iban TEXT,
  swift TEXT,
  logo_url TEXT,
  invoice_color TEXT DEFAULT '#0fbfb6',
  invoice_number_prefix TEXT DEFAULT 'FA',
  invoice_number_format TEXT DEFAULT '{prefix}-{year}-{seq}',
  next_invoice_seq INTEGER NOT NULL DEFAULT 1,
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days'),
  subscription_active BOOLEAN NOT NULL DEFAULT FALSE,
  subscription_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ===== CLIENTS =====
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ico TEXT,
  dic TEXT,
  email TEXT,
  phone TEXT,
  street TEXT,
  city TEXT,
  zip TEXT,
  country TEXT NOT NULL DEFAULT 'CZ',
  default_payment_days INTEGER NOT NULL DEFAULT 14,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients" ON public.clients
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_clients_user ON public.clients(user_id);

-- ===== INVOICES =====
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  client_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  supplier_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  issue_date DATE NOT NULL DEFAULT current_date,
  due_date DATE NOT NULL DEFAULT (current_date + interval '14 days'),
  taxable_date DATE NOT NULL DEFAULT current_date,
  currency TEXT NOT NULL DEFAULT 'CZK',
  exchange_rate NUMERIC(14, 6) NOT NULL DEFAULT 1,
  subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  rounding NUMERIC(14, 2) NOT NULL DEFAULT 0,
  variable_symbol TEXT,
  constant_symbol TEXT,
  specific_symbol TEXT,
  payment_method TEXT NOT NULL DEFAULT 'bank_transfer',
  notes TEXT,
  internal_notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_status ON public.invoices(user_id, status);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);

-- ===== INVOICE ITEMS =====
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'ks',
  unit_price NUMERIC(14, 4) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 21,
  line_subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_vat NUMERIC(14, 2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage items of own invoices" ON public.invoice_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.user_id = auth.uid()));

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ===== AUTO-CREATE PROFILE TRIGGER =====
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== UPDATED_AT TRIGGER =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== STORAGE: logos bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'logos');
CREATE POLICY "Users can upload own logo" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own logo" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own logo" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos' AND (storage.foldername(name))[1] = auth.uid()::text);