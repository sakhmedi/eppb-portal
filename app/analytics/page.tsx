// Публичный каталог аналитических материалов дочерних организаций (ТЗ 6.7).
// Это ВИТРИНА готовых материалов (ссылки/встраивание), а не BI-система. Доступна всем
// (RLS analytics_items — public read). Серверный компонент грузит материалы, интерактив
// (фильтры) — в клиентском AnalyticsBrowser.

import type { Metadata } from "next";

import { getAnalyticsItems } from "@/lib/analytics";
import { AnalyticsBrowser } from "@/components/analytics/analytics-browser";

export const metadata: Metadata = {
  title: "Аналитика и отчётность — ЕППБ",
  description:
    "Каталог аналитических материалов дочерних организаций холдинга «Байтерек»: годовые и финансовые отчёты, дашборды, исследования и обзоры со ссылками и встраиванием.",
};

export default async function AnalyticsPage() {
  const items = await getAnalyticsItems();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Аналитика и отчётность</h1>
        <p className="text-muted-foreground">
          Готовые материалы дочерних организаций холдинга «Байтерек»: отчёты, дашборды,
          исследования и обзоры. Откройте источник или встроенный материал прямо здесь.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Материалы пока не загружены. Примените миграции с демо-данными аналитики, и каталог
          наполнится.
        </div>
      ) : (
        <AnalyticsBrowser items={items} />
      )}
    </main>
  );
}
