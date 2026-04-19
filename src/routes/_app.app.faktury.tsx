import { createFileRoute } from "@tanstack/react-router";
import { Construction } from "lucide-react";

export const Route = createFileRoute("/_app/app/faktury")({
  head: () => ({ meta: [{ title: "Faktury — Fakturio" }] }),
  component: () => (
    <Placeholder title="Faktury" desc="Editor faktur, PDF s QR platbou a AI asistent přijdou v další vlně." />
  ),
});

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center p-16 text-center">
      <Construction className="h-12 w-12 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted-foreground">{desc}</p>
    </div>
  );
}
