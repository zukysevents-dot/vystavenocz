import { Link } from "@tanstack/react-router";
import { Sparkles, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string;
}

export function PaywallDialog({ open, onOpenChange, reason }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-coral/10 text-coral">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl">
            Zkušební doba skončila
          </DialogTitle>
          <DialogDescription className="text-center">
            {reason ||
              "Pro vystavení faktury aktivujte tarif Vystaveno Pro. Vaše data zůstávají uložená."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-surface-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-coral" /> Vystaveno Pro
          </div>
          <p className="mt-1 text-2xl font-bold text-foreground">
            100 Kč <span className="text-sm font-normal text-muted-foreground">/ měsíc</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Při ročním tarifu (1 200 Kč/rok). Měsíčně 159 Kč. Cena je konečná — neplátce DPH.
          </p>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Zatím ne
          </Button>
          <Button asChild variant="coral" className="sm:flex-1">
            <Link to="/app/predplatne">Aktivovat předplatné</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}