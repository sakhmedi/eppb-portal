"use server";

// Server Action-обёртки над AI-слоем. Клиентские компоненты (ServiceFinder, ExplainService)
// вызывают эти функции вместо прямого обращения к lib/ai/* — так вызовы модели и ключ
// остаются на сервере. Функции публичные (услуги и каталог видны всем), вход не доверяем:
// подбор и объяснение работают на реальных данных из БД, а не на присланных клиентом.

import { getPublishedServices, getServiceBySlug } from "@/lib/services";
import { getUser, getProfile } from "@/lib/auth";
import { splitStages, serviceForStage } from "@/lib/application-stages";
import { recommendServices, type ServiceRecommendation } from "@/lib/ai/recommend";
import { explainService } from "@/lib/ai/explain";
import { reviewApplication } from "@/lib/ai/review";
import {
  generateServiceDraft,
  type GenerateServiceResult,
} from "@/lib/ai/generate-service";
import type { AiResult } from "@/lib/ai/client";
import type { ApplicationFormData } from "@/types";

/** Максимальная длина описания ситуации — защита от слишком больших запросов. */
const MAX_SITUATION_LENGTH = 1000;
/** Максимальная длина описания услуги для генератора структуры. */
const MAX_DESCRIPTION_LENGTH = 4000;

/**
 * Подобрать услуги по описанию ситуации. Каталог берём из БД на сервере (не от клиента),
 * поэтому AI выбирает только из реально опубликованных услуг.
 */
export async function recommendServicesAction(
  situation: string,
): Promise<AiResult<ServiceRecommendation[]>> {
  const text = (situation ?? "").trim().slice(0, MAX_SITUATION_LENGTH);
  if (!text) return { ok: true, data: [] };

  const catalog = await getPublishedServices();
  return recommendServices(text, catalog);
}

/**
 * Объяснить услугу простыми словами. Услугу тянем по slug из БД (RLS отдаёт анониму только
 * published) — если её нет, честно возвращаем недоступность вместо падения.
 */
export async function explainServiceAction(slug: string): Promise<AiResult<string>> {
  const service = await getServiceBySlug(slug);
  if (!service) return { ok: false, reason: "unavailable" };

  return explainService(service);
}

/**
 * Функция 1: проверить заполненную заявку перед отправкой (AI-подсказки, не блокировка).
 * Услугу берём из БД по slug (авторитетные определения полей), проверяем только шаги
 * текущей фазы — так на первичном этапе не «ругаемся» на ещё не приложенные документы.
 */
export async function reviewApplicationAction(
  slug: string,
  phase: "primary" | "documents",
  formData: ApplicationFormData,
): Promise<AiResult<string[]>> {
  // Проверка заявки доступна только вошедшему пользователю (это его черновик).
  const user = await getUser();
  if (!user) return { ok: false, reason: "unavailable" };

  const service = await getServiceBySlug(slug);
  if (!service) return { ok: false, reason: "unavailable" };

  const { primarySteps, documentSteps } = splitStages(service);
  // На этапе документов показываем и первичные шаги (только чтение) — их данные тоже
  // проверяем; на первичном — только первичные шаги.
  const stageSteps =
    phase === "documents" ? [...primarySteps, ...documentSteps] : primarySteps;

  return reviewApplication(serviceForStage(service, stageSteps), formData ?? {});
}

/**
 * Функция 2: сгенерировать черновик структуры услуги по текстовому описанию.
 * Только для админа: генерация не пишет в БД, поэтому RLS её не прикрывает — роль проверяем
 * явно. Возвращаем черновик (валидный по serviceConfigSchema) или понятную ошибку.
 */
export async function generateServiceDraftAction(
  description: string,
): Promise<GenerateServiceResult> {
  const profile = await getProfile();
  if (profile?.role !== "admin") return { ok: false, reason: "unavailable" };

  const text = (description ?? "").trim().slice(0, MAX_DESCRIPTION_LENGTH);
  if (!text) {
    return { ok: false, reason: "invalid", message: "Опишите услугу словами." };
  }

  return generateServiceDraft(text);
}
