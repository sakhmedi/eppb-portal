"use server";

// Server Actions подачи заявки. Пишем через серверный клиент под сессией пользователя —
// RLS пускает только свои заявки (draft/awaiting_documents). Сервер НЕ доверяет клиенту:
//   - услугу берём из БД по service_id (а не из клиентского объекта);
//   - расчётные поля пересчитываем сами (applyCalculations);
//   - данные проверяем buildFormSchema перед сменой статуса;
//   - на этапе документов первичные данные неизменны — мёржим только ключи полей-документов.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getServiceById } from "@/lib/services";
import { applyCalculations } from "@/lib/formula";
import { buildFormSchema } from "@/lib/form-schema";
import {
  splitStages,
  serviceForStage,
  documentStageFieldKeys,
} from "@/lib/application-stages";
import type {
  ApplicationFormData,
  ApplicationDocument,
  ApplicationStatus,
  ApplicationStatusChange,
} from "@/types";

export interface SubmitResult {
  ok: boolean;
  errors?: string[];
  status?: ApplicationStatus;
  id?: string;
}

/** Уникальные человекочитаемые сообщения из ошибок Zod. */
function messagesOf(error: z.ZodError): string[] {
  return Array.from(new Set(error.issues.map((i) => i.message)));
}

function historyEntry(
  status: ApplicationStatus,
  userId: string,
  comment: string,
): ApplicationStatusChange {
  return { status, changedBy: userId, changedAt: new Date().toISOString(), comment };
}

/**
 * Автосейв прогресса. В статусе draft сохраняем данные как есть; в awaiting_documents —
 * только ключи полей этапа документов (+ documents), не трогая уже поданные первичные данные.
 */
export async function saveDraft(
  appId: string,
  patch: {
    formData?: ApplicationFormData;
    currentStepId?: string;
    documents?: ApplicationDocument[];
  },
): Promise<SubmitResult> {
  const supabase = createClient();

  const { data: app } = await supabase
    .from("applications")
    .select("id, service_id, status, form_data")
    .eq("id", appId)
    .maybeSingle();

  if (!app) return { ok: false, errors: ["Заявка не найдена"] };

  const update: Record<string, unknown> = {};

  if (patch.formData) {
    if (app.status === "awaiting_documents") {
      const service = await getServiceById(app.service_id);
      if (service) {
        const docKeys = documentStageFieldKeys(service);
        const merged: ApplicationFormData = { ...((app.form_data ?? {}) as ApplicationFormData) };
        for (const key of Object.keys(patch.formData)) {
          if (docKeys.has(key)) merged[key] = patch.formData[key];
        }
        update.form_data = merged;
      }
    } else {
      update.form_data = patch.formData;
    }
  }
  if (patch.currentStepId !== undefined) update.current_step_id = patch.currentStepId;
  if (patch.documents !== undefined) update.documents = patch.documents;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("applications").update(update).eq("id", appId);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true };
}

/**
 * Подача ПЕРВИЧНОЙ заявки (этап 1). Валидируем только первичные шаги, пересчитываем calc,
 * фиксируем версию услуги. Если у услуги есть этап документов — статус становится
 * awaiting_documents (ждём документы), иначе сразу submitted.
 */
export async function submitPrimary(
  appId: string,
  formData: ApplicationFormData,
): Promise<SubmitResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: ["Требуется вход в систему"] };

  const { data: app } = await supabase
    .from("applications")
    .select("id, service_id, status, status_history")
    .eq("id", appId)
    .maybeSingle();
  if (!app) return { ok: false, errors: ["Заявка не найдена"] };

  const service = await getServiceById(app.service_id);
  if (!service) return { ok: false, errors: ["Услуга не найдена"] };

  // Не доверяем расчётным значениям с клиента — пересчитываем на сервере.
  const recalculated = applyCalculations(service, formData);

  const { primarySteps, hasDocumentStage } = splitStages(service);
  const schema = buildFormSchema(serviceForStage(service, primarySteps));
  const result = schema.safeParse(recalculated);
  if (!result.success) return { ok: false, errors: messagesOf(result.error) };

  const nextStatus: ApplicationStatus = hasDocumentStage ? "awaiting_documents" : "submitted";
  const comment = hasDocumentStage ? "Первичная заявка подана" : "Заявка подана";
  const history = [
    ...((app.status_history ?? []) as ApplicationStatusChange[]),
    historyEntry(nextStatus, user.id, comment),
  ];

  const { error } = await supabase
    .from("applications")
    .update({
      form_data: recalculated,
      service_version: service.version ?? null,
      status: nextStatus,
      status_history: history,
    })
    .eq("id", appId);
  if (error) return { ok: false, errors: [error.message] };

  revalidatePath("/account");
  return { ok: true, status: nextStatus, id: appId };
}

/**
 * Завершение подачи (этап 2): документы и согласия. Первичные данные берём из БД (неизменны),
 * добавляем только ключи полей этапа документов, пересчитываем calc, валидируем ВСЮ услугу,
 * статус → submitted.
 */
export async function submitDocuments(
  appId: string,
  formData: ApplicationFormData,
  documents: ApplicationDocument[],
): Promise<SubmitResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, errors: ["Требуется вход в систему"] };

  const { data: app } = await supabase
    .from("applications")
    .select("id, service_id, status, form_data, documents, status_history")
    .eq("id", appId)
    .maybeSingle();
  if (!app) return { ok: false, errors: ["Заявка не найдена"] };
  if (app.status !== "awaiting_documents") {
    return { ok: false, errors: ["Заявка не ожидает документов"] };
  }

  const service = await getServiceById(app.service_id);
  if (!service) return { ok: false, errors: ["Услуга не найдена"] };

  // Первичные данные из БД + только ключи полей этапа документов из клиента.
  const docKeys = documentStageFieldKeys(service);
  const merged: ApplicationFormData = { ...((app.form_data ?? {}) as ApplicationFormData) };
  for (const key of Object.keys(formData)) {
    if (docKeys.has(key)) merged[key] = formData[key];
  }
  const recalculated = applyCalculations(service, merged);

  // Полная проверка всей заявки (все шаги, условная обязательность).
  const schema = buildFormSchema(service);
  const result = schema.safeParse(recalculated);
  if (!result.success) return { ok: false, errors: messagesOf(result.error) };

  const history = [
    ...((app.status_history ?? []) as ApplicationStatusChange[]),
    historyEntry("submitted", user.id, "Документы предоставлены, заявка подана"),
  ];

  const { error } = await supabase
    .from("applications")
    .update({
      form_data: recalculated,
      documents: documents ?? (app.documents ?? []),
      status: "submitted",
      status_history: history,
    })
    .eq("id", appId);
  if (error) return { ok: false, errors: [error.message] };

  revalidatePath("/account");
  return { ok: true, status: "submitted", id: appId };
}
