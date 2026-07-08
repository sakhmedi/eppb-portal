"use server";

// Server Actions конструктора: создать черновик, сохранить, опубликовать/снять.
// Пишем через серверный клиент Supabase — RLS-политика "services: admin write"
// пропускает запись только админам (is_admin() в БД), так что отдельный
// service_role-клиент здесь не нужен.
//
// Идея статусов: черновик (draft) можно сохранять хоть неполным — это рабочая
// заготовка. А публикация (published) прогоняет полную проверку serviceConfigSchema
// (уникальность key, целостность ссылок в условиях/формулах) и не даёт
// опубликовать «сломанную» услугу.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { serviceConfigSchema } from "@/lib/schemas";
import type { Step } from "@/types";

/** Полезная нагрузка из конструктора (то, что редактирует админ). */
export interface ServiceInput {
  title: string;
  description?: string;
  category?: string;
  organization?: string;
  steps: Step[];
}

export interface SaveResult {
  ok: boolean;
  /** Ошибки валидации (для публикации) — человекочитаемые строки. */
  errors?: string[];
}

/** Общая запись meta+steps в строку услуги. */
async function writeService(id: string, input: ServiceInput, status?: "draft" | "published") {
  const supabase = createClient();
  const patch: Record<string, unknown> = {
    title: input.title,
    description: input.description || null,
    category: input.category || null,
    organization: input.organization || null,
    steps: input.steps,
  };
  if (status) patch.status = status;
  return supabase.from("services").update(patch).eq("id", id);
}

/** Создать пустой черновик и сразу открыть его в редакторе. */
export async function createDraftService(): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({ title: "Новая услуга", status: "draft", steps: [] })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Не удалось создать услугу");
  revalidatePath("/admin/services");
  redirect(`/admin/services/${data.id}`);
}

/** Сохранить черновик (без строгой проверки — заготовку можно хранить неполной). */
export async function saveService(id: string, input: ServiceInput): Promise<SaveResult> {
  if (!input.title.trim()) return { ok: false, errors: ["Укажите название услуги"] };

  const { error } = await writeService(id, input);
  if (error) return { ok: false, errors: [error.message] };

  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/admin/services");
  return { ok: true };
}

/** Опубликовать: сперва строгая проверка конфига, затем status='published'. */
export async function publishService(id: string, input: ServiceInput): Promise<SaveResult> {
  const parsed = serviceConfigSchema.safeParse({
    title: input.title,
    description: input.description || undefined,
    category: input.category || undefined,
    organization: input.organization || undefined,
    status: "published",
    steps: input.steps,
  });

  if (!parsed.success) {
    // Превращаем ошибки Zod в короткие подсказки для админа.
    const errors = parsed.error.issues.map((i) => i.message);
    return { ok: false, errors: Array.from(new Set(errors)) };
  }

  const { error } = await writeService(id, input, "published");
  if (error) return { ok: false, errors: [error.message] };

  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/admin/services");
  revalidatePath("/catalog");
  return { ok: true };
}

/** Снять с публикации (вернуть в черновик). */
export async function unpublishService(id: string, input: ServiceInput): Promise<SaveResult> {
  const { error } = await writeService(id, input, "draft");
  if (error) return { ok: false, errors: [error.message] };

  revalidatePath(`/admin/services/${id}`);
  revalidatePath("/admin/services");
  revalidatePath("/catalog");
  return { ok: true };
}
