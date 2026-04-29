import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { PageHeader } from "@/components/landing/PageHeader";
import { getArticlesSortedByDate } from "@/lib/articles";
import { Clock, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/clanky/")({
  head: () => ({
    meta: [
      { title: "Články a rady pro OSVČ — Vystaveno.cz" },
      {
        name: "description",
        content:
          "Praktické návody pro živnostníky a freelancery: jak založit živnost, vystavit fakturu, kdy se stát plátcem DPH, paušální daň a další.",
      },
      { property: "og:title", content: "Články a rady pro OSVČ — Vystaveno.cz" },
      {
        property: "og:description",
        content:
          "Praktické návody pro živnostníky a freelancery: živnost, faktury, DPH, daně.",
      },
    ],
  }),
  component: ArticlesIndex,
});

function ArticlesIndex() {
  const list = getArticlesSortedByDate();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Akademie"
        title="Články a rady pro OSVČ"
        subtitle="Praktické návody bez vaty — od založení živnosti přes fakturaci až po daně. Vše ověřeno podle aktuální české legislativy."
      />

      <section className="bg-background pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <Link
                key={a.slug}
                to="/clanky/$slug"
                params={{ slug: a.slug }}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-coral/40 hover:shadow-card"
              >
                <div className="mb-3 inline-flex w-fit items-center rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
                  {a.category}
                </div>
                <h2 className="text-lg font-semibold leading-snug text-foreground group-hover:text-coral">
                  {a.title}
                </h2>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {a.excerpt}
                </p>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {a.readingMinutes} min čtení
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-coral">
                    Číst <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}