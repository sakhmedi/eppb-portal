// Слой доступа к аналитическим материалам (серверное чтение). Паттерн как lib/projects.ts:
// строка БД (snake_case) → доменный тип AnalyticsItem. RLS analytics_items — public read,
// поэтому каталог доступен всем без входа.

import { createClient } from "@/lib/supabase/server";
import type { AnalyticsItem, AnalyticsAccess } from "@/types";

interface AnalyticsRow {
  id: string;
  title: string;
  description: string | null;
  organization: string | null;
  category: string | null; // вид материала
  period: string | null;
  access_type: string | null;
  url: string | null;
}

function rowToItem(row: AnalyticsRow): AnalyticsItem {
  // Нормализуем тип доступа: всё, кроме 'embed', считаем внешней ссылкой.
  const accessType: AnalyticsAccess = row.access_type === "embed" ? "embed" : "link";
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    organization: row.organization ?? undefined,
    kind: row.category ?? undefined,
    period: row.period ?? undefined,
    accessType,
    url: row.url ?? undefined,
  };
}

const COLUMNS = "id, title, description, organization, category, period, access_type, url";

/** Все материалы каталога. Пустой массив, если таблица ещё не наполнена — страница не падает. */
export async function getAnalyticsItems(): Promise<AnalyticsItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("analytics_items")
    .select(COLUMNS)
    .order("title");

  return (data ?? []).map((row) => rowToItem(row as AnalyticsRow));
}

/** Один материал по id — для страницы материала. null, если не найден. */
export async function getAnalyticsItemById(id: string): Promise<AnalyticsItem | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("analytics_items")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  return data ? rowToItem(data as AnalyticsRow) : null;
}
