// Публичная карточка услуги. Доступна всем.
// Всё содержимое собирается ИЗ JSON-конфига услуги (см. lib/service-summary.ts),
// поэтому страница работает для любой опубликованной услуги, без хардкода.
// RLS отдаёт анониму только published — если услуги нет или она черновик, показываем 404.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  ChevronRight,
  Building2,
  Layers,
  FolderClosed,
  FileText,
  Calculator,
  CheckCircle2,
} from "lucide-react";

import { getServiceBySlug } from "@/lib/services";
import { getServiceFacts, pluralSteps } from "@/lib/service-summary";
import { ExplainService } from "@/components/ai/explain-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const service = await getServiceBySlug(params.slug);
  if (!service) return { title: "Услуга не найдена — ЕППБ" };
  return {
    title: `${service.title} — ЕППБ`,
    description: service.description ?? undefined,
  };
}

// Маленькая плитка «ключевого параметра».
function FactTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <span className="bg-brand-subtle flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
        <Icon className="h-5 w-5 text-brand" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{value}</div>
      </div>
    </div>
  );
}

export default async function ServicePage({ params }: PageProps) {
  const service = await getServiceBySlug(params.slug);
  if (!service) notFound();

  const facts = getServiceFacts(service);
  const applyHref = `/services/${service.slug}/apply`;
  const hasConditionalDocs = facts.documents.some((d) => d.conditional);

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/catalog" className="transition-colors hover:text-foreground">
          Каталог услуг
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{service.title}</span>
      </nav>

      {/* Шапка */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {service.category && <Badge variant="secondary">{service.category}</Badge>}
          {service.organization && (
            <span className="text-sm text-muted-foreground">{service.organization}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{service.title}</h1>
        {service.description && (
          <p className="text-balance text-lg leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        )}
      </header>

      {/* CTA */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Подача онлайн · {facts.stepCount} {pluralSteps(facts.stepCount)}
          {facts.documents.length > 0 ? " · нужны документы" : ""}
        </div>
        <Button asChild size="lg" className="bg-brand">
          <Link href={applyHref}>
            Подать заявку
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Ключевые параметры */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {service.category && (
          <FactTile icon={Layers} label="Направление" value={service.category} />
        )}
        {service.organization && (
          <FactTile icon={Building2} label="Организация" value={service.organization} />
        )}
        <FactTile
          icon={FileText}
          label="Шагов подачи"
          value={String(facts.stepCount)}
        />
        <FactTile
          icon={FolderClosed}
          label="Документов"
          value={facts.documents.length > 0 ? String(facts.documents.length) : "—"}
        />
      </section>

      {/* Как проходит подача */}
      {facts.stepTitles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Как проходит подача</h2>
          <ol className="space-y-3">
            {facts.stepTitles.map((title, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="bg-brand-subtle flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <span className="pt-0.5">{title}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Какие документы понадобятся */}
      {facts.documents.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Какие документы понадобятся
          </h2>
          {hasConditionalDocs && (
            <p className="text-sm text-muted-foreground">
              Точный перечень зависит от ваших ответов в форме — ниже все возможные документы.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {facts.documents.map((doc) => (
              <div
                key={doc.label}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 space-y-1">
                  <div className="font-medium leading-snug">{doc.label}</div>
                  {doc.hint && (
                    <div className="text-sm text-muted-foreground">{doc.hint}</div>
                  )}
                  <Badge variant="outline" className="text-xs font-normal">
                    {doc.conditional
                      ? "по ситуации"
                      : doc.required
                        ? "обязательный"
                        : "по желанию"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI: объяснить простыми словами (slug на этой странице всегда есть) */}
      {service.slug && <ExplainService slug={service.slug} />}

      {/* Что дальше */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle2 className="h-5 w-5 text-brand" />
            Что дальше
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Вы заполните заявку из {facts.stepCount}{" "}
            {facts.stepCount === 1 ? "шага" : "шагов"} онлайн и приложите документы.
            После отправки заявка поступит на рассмотрение в организацию, а её статус
            будет виден в вашем личном кабинете.
          </p>
          {facts.calculatedOutputs.length > 0 && (
            <p className="flex items-start gap-2">
              <Calculator className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span>
                В форме автоматически рассчитается:{" "}
                {facts.calculatedOutputs.map((c) => c.label).join(", ")}.
              </span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Нижний CTA + назад */}
      <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/catalog"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          ← Назад в каталог
        </Link>
        <Button asChild size="lg" className="bg-brand">
          <Link href={applyHref}>
            Подать заявку
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </main>
  );
}
