// Страница одного аналитического материала. Доступна всем (RLS public read).
//   embed → показываем встроенный материал (iframe) + фолбэк-ссылка;
//   link  → описание + крупная кнопка «Открыть в новой вкладке».

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChevronRight, Building2, CalendarRange, ExternalLink, Frame } from "lucide-react";

import { getAnalyticsItemById } from "@/lib/analytics";
import { EmbedViewer } from "@/components/analytics/embed-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const item = await getAnalyticsItemById(params.id);
  return { title: item ? `${item.title} — ЕППБ` : "Материал не найден — ЕППБ" };
}

export default async function AnalyticsItemPage({ params }: PageProps) {
  const item = await getAnalyticsItemById(params.id);
  if (!item) notFound();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      {/* Хлебные крошки */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/analytics" className="transition-colors hover:text-foreground">
          Аналитика
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground">{item.title}</span>
      </nav>

      {/* Шапка */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {item.kind && <Badge variant="secondary">{item.kind}</Badge>}
          {item.accessType === "embed" && (
            <Badge variant="outline" className="gap-1 font-normal">
              <Frame className="h-3 w-3" />
              встраивается
            </Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm text-muted-foreground">
          {item.organization && (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {item.organization}
            </span>
          )}
          {item.period && (
            <span className="flex items-center gap-2">
              <CalendarRange className="h-4 w-4" />
              {item.period}
            </span>
          )}
        </div>
        {item.description && (
          <p className="text-balance leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
      </header>

      {/* Доступ к материалу */}
      {item.accessType === "embed" && item.url ? (
        <EmbedViewer url={item.url} title={item.title} />
      ) : item.url ? (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Материал размещён на внешнем ресурсе организации.
          </p>
          <Button asChild className="bg-brand shrink-0">
            <a href={item.url} target="_blank" rel="noopener noreferrer">
              Открыть в новой вкладке
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
          Ссылка на материал пока недоступна.
        </p>
      )}

      <Link
        href="/analytics"
        className="inline-block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ← Назад в каталог
      </Link>
    </main>
  );
}
