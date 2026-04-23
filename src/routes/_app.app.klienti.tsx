import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAres } from "@/hooks/use-ares";
import { toast } from "sonner";
import { Plus, Search, Loader2, Pencil, Trash2, Users, Check, Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/app/klienti")({
  head: () => ({ meta: [{ title: "Klienti — Vystaveno" }] }),
  component: ClientsPage,
});

type ClientRow = {
  id: string;
  name: string;
  ico: string | null;
  dic: string | null;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  zip: string | null;
  country: string;
  default_payment_days: number;
  notes: string | null;
};

const empty: Omit<ClientRow, "id"> = {
  name: "",
  ico: "",
  dic: "",
  email: "",
  phone: "",
  street: "",
  city: "",
  zip: "",
  country: "CZ",
  default_payment_days: 14,
  notes: "",
};

function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (error) toast.error(error.message);
    else setClients((data ?? []) as ClientRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("clients").delete().eq("id", deleteId);
    if (error) toast.error(error.message);
    else {
      toast.success("Klient smazán.");
      setClients((c) => c.filter((x) => x.id !== deleteId));
    }
    setDeleteId(null);
  };

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.ico ?? "").includes(q) ||
      (c.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Klienti</h1>
          <p className="mt-1 text-muted-foreground">Spravujte odběratele pro vaše faktury.</p>
        </div>
        <Button
          variant="coral"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> Nový klient
        </Button>
      </div>

      <div className="mt-6 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Hledat podle jména, IČO nebo e-mailu…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 text-lg font-semibold">
              {clients.length === 0 ? "Zatím žádní klienti" : "Nic nenalezeno"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {clients.length === 0
                ? "Přidejte prvního klienta s autoplněním z ARES."
                : "Zkuste jiný hledaný výraz."}
            </p>
            {clients.length === 0 && (
              <Button
                variant="coral"
                className="mt-4"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Přidat klienta
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-muted/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.ico ? `IČO ${c.ico}` : "Bez IČO"}
                      {c.city ? ` • ${c.city}` : ""}
                      {c.email ? ` • ${c.email}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(c);
                      setDialogOpen(true);
                    }}
                    title="Upravit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(c.id)}
                    title="Smazat"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        userId={user?.id}
        onSaved={(saved) => {
          setDialogOpen(false);
          setClients((prev) => {
            const idx = prev.findIndex((p) => p.id === saved.id);
            if (idx >= 0) {
              const copy = [...prev];
              copy[idx] = saved;
              return copy.sort((a, b) => a.name.localeCompare(b.name));
            }
            return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat klienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Klienta odstraníme z vašeho seznamu. Faktury vystavené pro něj zůstanou zachovány.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClientDialog({
  open,
  onOpenChange,
  editing,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ClientRow | null;
  userId: string | undefined;
  onSaved: (c: ClientRow) => void;
}) {
  const [form, setForm] = useState<Omit<ClientRow, "id">>(empty);
  const [submitting, setSubmitting] = useState(false);
  const ares = useAres();

  useEffect(() => {
    if (open) {
      if (editing) {
        const { id: _id, ...rest } = editing;
        setForm({
          ...rest,
          ico: rest.ico ?? "",
          dic: rest.dic ?? "",
          email: rest.email ?? "",
          phone: rest.phone ?? "",
          street: rest.street ?? "",
          city: rest.city ?? "",
          zip: rest.zip ?? "",
          notes: rest.notes ?? "",
        });
      } else {
        setForm(empty);
      }
      ares.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const fillFromAres = async () => {
    const result = await ares.lookup(form.ico ?? "");
    if (result) {
      setForm((f) => ({
        ...f,
        name: result.company_name ?? f.name,
        ico: result.ico,
        dic: result.dic ?? "",
        street: result.street ?? "",
        city: result.city ?? "",
        zip: result.zip ?? "",
        country: result.country ?? "CZ",
      }));
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!form.name.trim()) {
      toast.error("Zadejte jméno klienta.");
      return;
    }
    setSubmitting(true);
    const payload = {
      ...form,
      ico: form.ico || null,
      dic: form.dic || null,
      email: form.email || null,
      phone: form.phone || null,
      street: form.street || null,
      city: form.city || null,
      zip: form.zip || null,
      notes: form.notes || null,
    };
    if (editing) {
      const { data, error } = await supabase
        .from("clients")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Klient upraven.");
      onSaved(data as ClientRow);
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...payload, user_id: userId })
        .select()
        .single();
      setSubmitting(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Klient vytvořen.");
      onSaved(data as ClientRow);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Upravit klienta" : "Nový klient"}</DialogTitle>
          <DialogDescription>
            Vyplňte údaje ručně nebo načtěte firmu z veřejného registru ARES podle IČO.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="c-ico">IČO (auto-vyplnění z ARES)</Label>
            <div className="flex gap-2">
              <Input
                id="c-ico"
                inputMode="numeric"
                placeholder="12345678"
                value={form.ico ?? ""}
                onChange={(e) => setForm({ ...form, ico: e.target.value })}
              />
              <Button type="button" variant="outline" onClick={fillFromAres} disabled={ares.loading || !form.ico}>
                {ares.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Načíst z ARES
              </Button>
            </div>
            {ares.data && (
              <div className="flex items-center gap-2 text-xs text-success">
                <Check className="h-3.5 w-3.5" /> Údaje doplněny z ARES
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-name">Název / jméno *</Label>
            <Input id="c-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-dic">DIČ</Label>
              <Input id="c-dic" value={form.dic ?? ""} onChange={(e) => setForm({ ...form, dic: e.target.value })} placeholder="CZ12345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-days">Splatnost (dny)</Label>
              <Input
                id="c-days"
                type="number"
                min={0}
                max={120}
                value={form.default_payment_days}
                onChange={(e) => setForm({ ...form, default_payment_days: Number(e.target.value) || 14 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-street">Ulice</Label>
            <Input id="c-street" value={form.street ?? ""} onChange={(e) => setForm({ ...form, street: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_140px_120px]">
            <div className="space-y-2">
              <Label htmlFor="c-city">Město</Label>
              <Input id="c-city" value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-zip">PSČ</Label>
              <Input id="c-zip" value={form.zip ?? ""} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-country">Země</Label>
              <Input id="c-country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value.toUpperCase() })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">Telefon</Label>
              <Input id="c-phone" value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="c-notes">Poznámka</Label>
            <Input id="c-notes" value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Interní poznámka…" />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Zrušit</Button>
            <Button type="submit" variant="coral" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Uložit změny" : "Vytvořit klienta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
