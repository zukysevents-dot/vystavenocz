import { useState } from "react";
import { toast } from "sonner";

export type AresResult = {
  ico: string;
  dic: string | null;
  company_name: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
};

export function useAres() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AresResult | null>(null);

  const lookup = async (rawIco: string): Promise<AresResult | null> => {
    const cleaned = rawIco.replace(/\s/g, "");
    if (!/^\d{6,8}$/.test(cleaned)) {
      toast.error("Zadejte platné IČO (6–8 číslic).");
      return null;
    }
    setLoading(true);
    setData(null);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ares-lookup?ico=${cleaned}`;
      const res = await fetch(url);
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Nepodařilo se načíst data z ARES.");
        return null;
      }
      setData(body);
      toast.success(`Načteno: ${body.company_name}`);
      return body as AresResult;
    } catch (err) {
      console.error(err);
      toast.error("Chyba sítě při dotazu na ARES.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setData(null);

  return { lookup, loading, data, reset };
}
