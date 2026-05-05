import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/landing/PageShell";
import { getArticleBySlug, getRelatedArticles, type ArticleBlock, type ArticleSection } from "@/lib/articles";
import { Clock, ArrowLeft, ArrowRight, Lightbulb, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/clanky/$slug")({
  loader: ({ params }) => {
    const article = getArticleBySlug(params.slug);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    const a = loaderData?.article;
    if (!a) return { meta: [{ title: "Článek nenalezen — Vystaveno.cz" }] };
    const scripts = a.faq && a.faq.length > 0
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: a.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          },
        ]
      : undefined;
    return {
      meta: [
        { title: `${a.title} — Vystaveno.cz` },
        { name: "description", content: a.excerpt },
        { property: "og:title", content: a.title },
        { property: "og:description", content: a.excerpt },
        { property: "og:type", content: "article" },
      ],
      scripts,
    };
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Článek nenalezen</h1>
        <p className="mt-3 text-muted-foreground">Tento článek neexistuje nebo byl přesunut.</p>
        <Button variant="coral" className="mt-6" asChild>
          <Link to="/clanky">Zpět na všechny články</Link>
        </Button>
      </div>
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Něco se pokazilo</h1>
        <p className="mt-3 text-muted-foreground">{error.message}</p>
      </div>
    </PageShell>
  ),
  component: ArticleDetail,
});

function Block({ block }: { block: ArticleBlock }) {
  if (block.type === "p") {
    return <p className="text-[15px] leading-[1.75] text-foreground/90">{block.text}</p>;
  }
  if (block.type === "ul") {
    return (
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-[1.7] text-foreground/90 marker:text-coral">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "ol") {
    return (
      <ol className="list-decimal space-y-2 pl-5 text-[15px] leading-[1.7] text-foreground/90 marker:font-semibold marker:text-coral">
        {block.items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ol>
    );
  }
  // callout
  const Icon = block.variant === "tip" ? Lightbulb : AlertTriangle;
  const tone =
    block.variant === "tip"
      ? "border-coral/30 bg-coral/5 text-foreground"
      : "border-destructive/30 bg-destructive/5 text-foreground";
  return (
    <div className={`flex gap-3 rounded-xl border p-4 text-[14px] leading-[1.6] ${tone}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-coral" />
      <p>{block.text}</p>
    </div>
  );
}

function ArticleDetail() {
  const { article } = Route.useLoaderData();
  const related = getRelatedArticles(article.slug, 3);

  const formattedDate = new Date(article.publishedAt).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PageShell>
      <article className="bg-background">
        <header className="relative overflow-hidden border-b border-border bg-hero">
          <div className="absolute inset-0 bg-mesh opacity-50" aria-hidden />
          <div className="relative mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
            <Link
              to="/clanky"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Zpět na články
            </Link>
            <div className="mt-5 inline-flex w-fit items-center rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-medium text-primary">
              {article.category}
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
              {article.title}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">{article.excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span>{formattedDate}</span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {article.readingMinutes} min čtení
              </span>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          {article.sections.map((section: ArticleSection) => (
            <section key={section.heading} className="mb-10 last:mb-0">
              <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">
                {section.heading}
              </h2>
              <div className="space-y-4">
                {section.blocks.map((block: ArticleBlock, i: number) => (
                  <Block key={i} block={block} />
                ))}
              </div>
            </section>
          ))}

          {/* CTA — využít to, že čtenář dočetl */}
          <div className="mt-12 rounded-2xl border border-border bg-card p-8 text-center">
            <h3 className="text-xl font-bold text-foreground">
              Vystav fakturu za 30 sekund
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Vyzkoušej Vystaveno.cz zdarma na 14 dní. Bez karty, bez závazků.
            </p>
            <Button variant="coral" size="lg" className="group mt-5" asChild>
              <a href="/registrace">
                Začít zdarma
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </a>
            </Button>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="border-t border-border bg-surface-soft py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="mb-6 text-xl font-bold text-foreground">Mohlo by tě zajímat</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    to="/clanky/$slug"
                    params={{ slug: r.slug }}
                    className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-coral/40 hover:shadow-card"
                  >
                    <div className="text-[11px] font-medium uppercase tracking-wide text-coral">
                      {r.category}
                    </div>
                    <h3 className="mt-2 text-base font-semibold leading-snug text-foreground group-hover:text-coral">
                      {r.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </PageShell>
  );
}