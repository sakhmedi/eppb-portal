"use server";

// Server Action-обёртки над AI-слоем. Клиентские компоненты (ServiceFinder, ExplainService)
// вызывают эти функции вместо прямого обращения к lib/ai/* — так вызовы модели и ключ
// остаются на сервере. Функции публичные (услуги и каталог видны всем), вход не доверяем:
// подбор и объяснение работают на реальных данных из БД, а не на присланных клиентом.

import { getPublishedServices, getServiceBySlug } from "@/lib/services";
import { recommendServices, type ServiceRecommendation } from "@/lib/ai/recommend";
import { explainService } from "@/lib/ai/explain";
import type { AiResult } from "@/lib/ai/client";

/** Максимальная длина описания ситуации — защита от слишком больших запросов. */
const MAX_SITUATION_LENGTH = 1000;

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
