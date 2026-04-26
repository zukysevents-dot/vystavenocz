import { useEffect, useState } from "react";
import { Loader2, Search, Check } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAres } from "@/hooks/use-ares";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ClientSnapshot } from "@/lib/invoice";

export type QuickClient = ClientSnapshot & {
  default_payment_days?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Volaný po potvrzení — předá data odběratele (a volitelně id, pokud byl uložen do seznamu). */
  onConfirm: (client: QuickClient, savedClientId: string | null) => void;
};

const empty: QuickClient = {
  name: "",
  ico: null,
  dic: null,
  street: null,
  city: null,
  zip: null,
  country: "CZ",
  email: null,
  default_payment_days: 14,
};

export function QuickClientDialog({ open, onOpenChange, onConfirm }: Props) {
  const { user } = useAuth();
  const ares = useAres();
  const [form, setForm] = useState<QuickClient>(empty);
  const [saveToList, setSaveToList] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reset stav při zavření / otevření
  useEffect(() => {
    if (!open) {
      setForm(empty);
      setSaveToList(true);
      setSaving(false);
      ares.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fillFromAres = async () => {
    const result = await ares.lookup(form.ico ?? "");
    if (!result) return;
    setForm((f) => ({
      ...f,
      name: result.company_name || f.name,
      ico: result.ico,
      dic: result.dic,
      street: result.street,
      city: result.city,
      zip: result.zip,
      country: result.country || "CZ",
    }));
  };

  const confirm = async () => {
    if (!form.name?.trim()) {
      toast.error("Vyplňte název odběratele.");
      return;
    }

    setSaving(true);
    try {
      let savedId: string | null = null;

      if (saveToList && user) {
        const { data, error } = await supabase
          .from("clients")
          .insert({
            user_id: user.id,
            name: form.name.trim(),
            ico: form.ico || null,
            dic: form.dic || null,
            street: form.street || null,
            city: form.city || null,
            zip: form.zip || null,
            country: form.country || "CZ",
            email: form.email || null,
            default_payment_days: form.default_payment_days ?? 14,
          })
          .select("id")
          .single();
        if (error) {
          toast.error("Nepodařilo se uložit klienta. Pokračuji bez uložení.");
        } else {
          savedId = data.id;
          toast.success("Klient přidán do seznamu.");
        }
      }

      onConfirm(form, savedId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nový odběratel</DialogTitle>
          <DialogDescription>
            Zadejte IČO a načtěte údaje z ARES, nebo je vyplňte ručně. Klient se použije pro tuto fakturu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="qc-ico">IČO (auto-vyplnění z ARES)</Label>
            <div className="flex gap-2">
              <Input
                id="qc-ico"
                value={form.ico ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ico: e.target.value.replace(/\D/g, "").slice(0, 8) }))
                }
                placeholder="napr. 12345678"
                inputMode="numeric"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void fillFromAres();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={fillFromAres}
                disabled={ares.loading || !form.ico}
              >
                {ares.loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Načíst z ARES
              </Button>
            </div>
            {ares.data && (
              <p className="flex items-center gap-1 text-xs text-primary">
                <Check className="h-3.5 w-3.5" /> Údaje doplněny z ARES
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-name">Název / Jméno *</Label>
            <Input
              id="qc-name"
              value={form.name ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Firma s.r.o. nebo Jan Novák"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="qc-dic">DIČ</Label>
              <Input
                id="qc-dic"
                value={form.dic ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, dic: e.target.value }))}
                placeholder="CZ12345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-email">E-mail</Label>
              <Input
                id="qc-email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="info@firma.cz"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qc-street">Ulice a č.p.</Label>
            <Input
              id="qc-street"
              value={form.street ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="qc-city">Město</Label>
              <Input
                id="qc-city"
                value={form.city ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-zip">PSČ</Label>
              <Input
                id="qc-zip"
                value={form.zip ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer">
            <Checkbox
              checked={saveToList}
              onCheckedChange={(v) => setSaveToList(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-0.5 text-sm">
              <div className="font-medium">Uložit i do seznamu klientů</div>
              <div className="text-xs text-muted-foreground">
                Při příští fakturaci ho už nebudete muset zadávat znovu.
              </div>
            </div>
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Zrušit
          </Button>
          <Button variant="coral" onClick={confirm} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Použít odběratele
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}