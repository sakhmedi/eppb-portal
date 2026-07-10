// Чтение заявок для серверных компонентов (страница подачи, личный кабинет).
// Мутации (сохранение/подача) — в lib/application-actions.ts.

import { createClient } from "@/lib/supabase/server";
import type {
  Service,
  ApplicationFormData,
  ApplicationDocument,
  ApplicationStatus,
} from "@/types";

/** Активная заявка пользователя по услуге — то, что нужно странице подачи. */
export interface ActiveApplication {
  id: string;
  status: ApplicationStatus;
  formData: ApplicationFormData;
  documents: ApplicationDocument[];
  currentStepId: string | null;
}

/** Строка applications в том виде, как её отдаёт выборка ниже. */
interface ApplicationRow {
  id: string;
  status: ApplicationStatus;
  form_data: ApplicationFormData | null;
  documents: ApplicationDocument[] | null;
  current_step_id: string | null;
}

function toActive(row: ApplicationRow): ActiveApplication {
  return {
    id: row.id,
    status: row.status,
    formData: row.form_data ?? {},
    documents: row.documents ?? [],
    currentStepId: row.current_step_id,
  };
}

/**
 * Вернуть текущую заявку пользователя по услуге, а если её нет — создать черновик.
 * Одна активная заявка на пару (пользователь, услуга): берём самую свежую.
 * RLS сама ограничивает доступ своими строками; user_id должен совпадать с сессией.
 */
export async function getOrCreateApplication(
  service: Service,
  userId: string,
): Promise<ActiveApplication> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status, form_data, documents, current_step_id")
    .eq("service_id", service.id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return toActive(existing as ApplicationRow);

  const { data: created, error } = await supabase
    .from("applications")
    .insert({
      service_id: service.id,
      service_version: service.version ?? null,
      user_id: userId,
      status: "draft",
      form_data: {},
      documents: [],
      status_history: [],
    })
    .select("id, status, form_data, documents, current_step_id")
    .single();

  if (error || !created) {
    throw new Error(error?.message ?? "Не удалось создать черновик заявки");
  }
  return toActive(created as ApplicationRow);
}

/** Краткая карточка заявки для списка в личном кабинете. */
export interface MyApplication {
  id: string;
  status: ApplicationStatus;
  updatedAt: string;
  serviceTitle: string;
  serviceSlug: string | null;
}

/** Заявки текущего пользователя (RLS отдаёт только свои). */
export async function getMyApplications(): Promise<MyApplication[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, updated_at, service:services(slug, title)")
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => {
    // service приходит как связанные данные услуги (Supabase типизирует join как массив);
    // берём первую запись, либо null, если услугу сняли с публикации.
    const rel = row.service as
      | { slug: string | null; title: string }
      | { slug: string | null; title: string }[]
      | null;
    const service = Array.isArray(rel) ? (rel[0] ?? null) : rel;
    return {
      id: row.id as string,
      status: row.status as ApplicationStatus,
      updatedAt: row.updated_at as string,
      serviceTitle: service?.title ?? "Услуга",
      serviceSlug: service?.slug ?? null,
    };
  });
}
