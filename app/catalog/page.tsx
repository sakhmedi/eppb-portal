// Публичный каталог услуг. Доступен всем.
// Серверный компонент грузит опубликованные услуги из БД (RLS отдаёт анониму только
// published) и собирает списки фактических категорий и организаций для фильтров.
// Интерактив (поиск, фильтры, пустые состояния) — в клиентском CatalogBrowser.

import { Suspense } from "react";
import type { Metadata } from "next";

import { getPublishedServices } from "@/lib/services";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";

export const metadata: Metadata = {
  title: "Каталог услуг — ЕППБ",
  description:
    "Каталог мер поддержки бизнеса холдинга «Байтерек»: поиск и фильтры по направлению и организации.",
};

// Уникальные непустые значения поля, отсортированные по алфавиту.
function distinct(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => !!v))).sort((a, b) =>
    a.localeCompare(b, "ru"),
  );
}

export default async function CatalogPage() {
  const services = await getPublishedServices();
  const categories = distinct(services.map((s) => s.category));
  const organizations = distinct(services.map((s) => s.organization));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Каталог услуг</h1>
        <p className="text-muted-foreground">
          Меры поддержки бизнеса холдинга «Байтерек» и его дочерних организаций.
        </p>
      </div>

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет опубликованных услуг.</p>
      ) : (
        // useSearchParams в CatalogBrowser требует Suspense-границы.
        <Suspense fallback={null}>
          <CatalogBrowser
            services={services}
            categories={categories}
            organizations={organizations}
          />
        </Suspense>
      )}
    </main>
  );
}
