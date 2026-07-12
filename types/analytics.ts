// Аналитический материал — карточка в каталоге аналитики (ТЗ 6.7).
// Таблица public.analytics_items (расширена миграцией 20260712110000).
// Это ВИТРИНА готовых материалов дочерних организаций (ссылки/встраивание), не BI-система.

/** Тип доступа к материалу. */
export type AnalyticsAccess = "link" | "embed";

/** Аналитический материал. */
export interface AnalyticsItem {
  id: string;
  title: string;
  description?: string;
  /** Источник / дочерняя организация. */
  organization?: string;
  /** Вид материала — из колонки category (напр. «Годовой отчёт», «Дашборд»). */
  kind?: string;
  /** Период актуальности (напр. «2024 год», «Q4 2025»). */
  period?: string;
  /** 'link' — внешняя ссылка (новая вкладка); 'embed' — встраивание через iframe. */
  accessType: AnalyticsAccess;
  /** Внешняя ссылка или URL для встраивания. */
  url?: string;
}
