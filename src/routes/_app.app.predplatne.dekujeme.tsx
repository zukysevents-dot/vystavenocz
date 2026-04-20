import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";

const searchSchema = z.object({ session_id: z.string().optional() });

export const Route = createFileRoute("/_app/app/predplatne/dekujeme")({
  head: () => ({ meta: [{ title: "Děkujeme — Fakturio" }] }),
  validateSearch: searchSchema,
  component: ThankYouPage,
});

function ThankYouPage() {
  const { session_id } = useSearch({ from: "/_app/app/predplatne/dekujeme" });
  const { isPaid, refresh } = useSubscription();

  useEffect(() => {
    // Poll for webhook to land
    if (isPaid) return;
    const interval = setInterval(() => {
      refresh();
    }, 2000);
    return () => clearInterval(interval);
  }, [isPaid, refresh]);

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      {isPaid ? (
        <>
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-6 text-3xl font-bold text-foreground">Děkujeme za předplatné!</h1>
          <p className="mt-3 text-muted-foreground">
            Fakturio Pro je aktivní. Můžete vystavovat faktury bez jakýchkoliv omezení.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="coral" size="lg">
              <Link to="/app/faktury/editor">Vystavit fakturu</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/app/predplatne">Spravovat předplatné</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <h1 className="mt-6 text-2xl font-bold text-foreground">Aktivujeme vaše předplatné…</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Zpracováváme platbu. Obvykle to trvá pár sekund.
          </p>
          {session_id && (
            <p className="mt-2 text-xs text-muted-foreground">Reference: {session_id.slice(-12)}</p>
          )}
        </>
      )}
    </div>
  );
}