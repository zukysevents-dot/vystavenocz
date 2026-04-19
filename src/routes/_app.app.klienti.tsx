import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_app/app/klienti")({
  head: () => ({ meta: [{ title: "Klienti — Fakturio" }] }),
  component: () => (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center p-16 text-center">
      <Construction className="h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">Klienti</h1>
      <p className="mt-2 text-muted-foreground">CRUD klientů přijde s vlnou 3.</p>
    </div>
  ),
});
