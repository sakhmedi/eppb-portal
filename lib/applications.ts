// Чтение заявок для серверных компонентов (страница подачи, личный кабинет).
// Мутации (сохранение/подача) — в lib/application-actions.ts.

import { createClient } from "@/lib/supabase/server";
import type {
  Service,
  ApplicationFormData,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationStatusChange,
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
  createdAt: string;
  updatedAt: string;
  serviceTitle: string;
  serviceSlug: string | null;
}

/** Услуга, как её отдаёт join к applications (Supabase типизирует связь как массив-или-объект). */
type ServiceRel =
  | { id?: string; slug: string | null; title: string }
  | { id?: string; slug: string | null; title: string }[]
  | null;

function relToService(rel: ServiceRel) {
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}

/** Заявки текущего пользователя (RLS отдаёт только свои). */
export async function getMyApplications(): Promise<MyApplication[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, status, created_at, updated_at, service:services(slug, title)")
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => {
    // service — связанные данные услуги, либо null, если услугу сняли с публикации.
    const service = relToService(row.service as ServiceRel);
    return {
      id: row.id as string,
      status: row.status as ApplicationStatus,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      serviceTitle: service?.title ?? "Услуга",
      serviceSlug: service?.slug ?? null,
    };
  });
}

/** Полная заявка для страницы отдельной заявки (кабинет пользователя и админка). */
export interface ApplicationDetail {
  id: string;
  status: ApplicationStatus;
  /** Владелец заявки. Нужен админке, чтобы подтянуть профиль заявителя. */
  userId: string;
  formData: ApplicationFormData;
  documents: ApplicationDocument[];
  statusHistory: ApplicationStatusChange[];
  serviceId: string;
  serviceVersion: number | null;
  serviceTitle: string;
  serviceSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Одна заявка пользователя по id. RLS отдаёт только свою строку (или админу) —
 * для чужого id вернётся null, поэтому страница показывает 404.
 */
export async function getApplicationById(id: string): Promise<ApplicationDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("applications")
    .select(
      "id, status, user_id, form_data, documents, status_history, service_id, service_version, created_at, updated_at, service:services(id, slug, title)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;

  const service = relToService(data.service as ServiceRel);
  return {
    id: data.id as string,
    status: data.status as ApplicationStatus,
    userId: data.user_id as string,
    formData: (data.form_data ?? {}) as ApplicationFormData,
    documents: (data.documents ?? []) as ApplicationDocument[],
    statusHistory: (data.status_history ?? []) as ApplicationStatusChange[],
    serviceId: data.service_id as string,
    serviceVersion: (data.service_version as number | null) ?? null,
    serviceTitle: service?.title ?? "Услуга",
    serviceSlug: service?.slug ?? null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/** Профиль заявителя (для шапки заявки в админке). */
export interface ApplicantProfile {
  fullName: string | null;
  email: string | null;
}

/**
 * Профиль владельца заявки по его user_id. RLS "profiles: read own or admin"
 * пускает админа к чужим профилям. null — если профиля нет.
 */
export async function getApplicantProfile(userId: string): Promise<ApplicantProfile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("users_profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  return { fullName: data.full_name ?? null, email: data.email ?? null };
}

/** Строка списка заявок в админке (все заявки, не только свои). */
export interface AdminApplicationSummary {
  id: string;
  number: string;
  status: ApplicationStatus;
  serviceTitle: string;
  applicantName: string | null;
  applicantEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Все заявки для админки. RLS "applications: read own or admin" отдаёт админу все строки.
 * Профили заявителей тянем отдельным запросом: FK applications.user_id ведёт на auth.users,
 * а не на users_profiles, поэтому встроенный join невозможен — джойним по id в JS.
 */
export async function listApplicationsForAdmin(): Promise<AdminApplicationSummary[]> {
  const supabase = createClient();

  const { data: rows } = await supabase
    .from("applications")
    .select("id, status, created_at, updated_at, user_id, service:services(title)")
    .order("created_at", { ascending: false });

  const apps = rows ?? [];
  const userIds = Array.from(new Set(apps.map((r) => r.user_id as string)));

  // Профили заявителей одним запросом (users_profiles.id === applications.user_id).
  const profiles = new Map<string, { full_name: string | null; email: string | null }>();
  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from("users_profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    for (const p of profileRows ?? []) {
      profiles.set(p.id as string, { full_name: p.full_name ?? null, email: p.email ?? null });
    }
  }

  return apps.map((row) => {
    const service = relToService(row.service as ServiceRel);
    const profile = profiles.get(row.user_id as string);
    return {
      id: row.id as string,
      number: (row.id as string).slice(0, 8).toUpperCase(),
      status: row.status as ApplicationStatus,
      serviceTitle: service?.title ?? "Услуга",
      applicantName: profile?.full_name ?? null,
      applicantEmail: profile?.email ?? null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  });
}
