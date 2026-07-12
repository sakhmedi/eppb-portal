// Слой доступа к проектам для карты (серверное чтение). Паттерн как в lib/services.ts:
// читаем строку БД (snake_case) и маппим в доменный тип Project (camelCase).
// RLS у projects — public read, поэтому карта доступна всем без авторизации.

import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/types";

interface ProjectRow {
  id: string;
  title: string;
  description: string | null;
  organization: string | null;
  region: string | null;
  locality: string | null;
  industry: string | null;
  funding_amount: number | null;
  start_year: number | null;
  end_year: number | null;
  latitude: number | null;
  longitude: number | null;
  status: string | null;
}

function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    organization: row.organization ?? undefined,
    region: row.region ?? undefined,
    locality: row.locality ?? undefined,
    industry: row.industry ?? undefined,
    fundingAmount: row.funding_amount ?? undefined,
    startYear: row.start_year ?? undefined,
    endYear: row.end_year ?? undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    status: row.status ?? undefined,
  };
}

/**
 * Все проекты с координатами (без координат точку на карту не поставить).
 * Возвращаем пустой массив, если таблица ещё не наполнена — страница не падает.
 */
export async function getProjects(): Promise<Project[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, title, description, organization, region, locality, industry, funding_amount, start_year, end_year, latitude, longitude, status",
    )
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("title");

  return (data ?? []).map((row) => rowToProject(row as ProjectRow));
}
