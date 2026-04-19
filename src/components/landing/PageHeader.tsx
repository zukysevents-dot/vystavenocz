import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  cta?: boolean;
}

export function PageHeader({ eyebrow, title, subtitle, cta = false }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-hero">
      <div className="absolute inset-0 bg-mesh opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
        )}
        {cta && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button variant="coral" size="lg" className="group">
              Vyzkoušet 30 dní zdarma
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
