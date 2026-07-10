// Слой доступа к услугам и справочникам для СЕРВЕРНЫХ компонентов.
// Здесь только чтение и маппинг «строка БД ↔ доменный тип Service».
// Мутации (создать/сохранить/опубликовать) — в lib/services-actions.ts.

import { createClient } from "@/lib/supabase/server";
import type { Service, Step, ReferenceOption, ServiceStatus, ID } from "@/types";

/** Строка таблицы services как её отдаёт Supabase (snake_case). */
interface ServiceRow {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string | null;
  organization: string | null;
  status: ServiceStatus;
  version: number | null;
  steps: Step[] | null;
  created_at: string;
  updated_at: string;
}

/** Справочник (для привязки к select-полям и разрешения опций в предпросмотре). */
export interface ReferenceList {
  id: ID;
  title: string;
  options: ReferenceOption[];
}

/** Публичная карточка услуги для главной и каталога (только нужные поля). */
export interface PublicService {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  organization: string | null;
}

/** Краткая карточка услуги для списка в админке. */
export interface ServiceSummary {
  id: ID;
  title: string;
  category: string | null;
  organization: string | null;
  status: ServiceStatus;
  stepsCount: number;
  updatedAt: string;
}

/** Превращает строку БД в доменный объект Service (camelCase, steps как есть). */
export function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    slug: row.slug ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    organization: row.organization ?? undefined,
    status: row.status,
    version: row.version ?? undefined,
    steps: row.steps ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Список услуг для админки (все статусы — RLS пускает админа ко всему). */
export async function listServiceSummaries(): Promise<ServiceSummary[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("services")
    .select("id, title, category, organization, status, steps, updated_at")
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    organization: row.organization,
    status: row.status,
    stepsCount: Array.isArray(row.steps) ? row.steps.length : 0,
    updatedAt: row.updated_at,
  }));
}

/**
 * Опубликованные услуги для публичных страниц (главная, каталог).
 * RLS в БД сама отдаёт анониму только status = 'published', поэтому фильтр по статусу
 * здесь не нужен. Услуги без slug пропускаем: на них нет страницы детали (ссылка вела бы
 * в 404), поэтому в каталоге и на главной их не показываем.
 */
export async function getPublishedServices(): Promise<PublicService[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("services")
    .select("slug, title, description, category, organization")
    .not("slug", "is", null)
    .order("title");

  return (data ?? []).map((row) => ({
    slug: row.slug as string,
    title: row.title,
    description: row.description,
    category: row.category,
    organization: row.organization,
  }));
}

/** Одна услуга по id (для редактора). null — если не найдена. */
export async function getServiceById(id: string): Promise<Service | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ? rowToService(data as ServiceRow) : null;
}

/** Все справочники — для привязки к полям и для предпросмотра. */
export async function listReferenceLists(): Promise<ReferenceList[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("reference_lists")
    .select("id, title, options")
    .order("title");

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    options: (row.options ?? []) as ReferenceOption[],
  }));
}

/** Собрать map { referenceId → options[] } для FormRenderer (предпросмотр). */
export function referencesToMap(refs: ReferenceList[]): Record<ID, ReferenceOption[]> {
  const map: Record<ID, ReferenceOption[]> = {};
  for (const r of refs) map[r.id] = r.options;
  return map;
}
