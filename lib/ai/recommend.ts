import "server-only";

// Сценарий 1: подбор услуги по описанию ситуации.
// Пользователь описывает ситуацию словами → AI выбирает 1–3 подходящие услуги ИЗ РЕАЛЬНОГО
// каталога (переданного из БД) и коротко объясняет, почему они подходят.
//
// Две гарантии честности:
//  1. Модель инструктируется выбирать ТОЛЬКО из переданного списка и возвращать пустой
//     массив, если ничего не подходит (не выдумывать услуги).
//  2. НЕЗАВИСИМО от модели — в нашем коде фильтруем ответ, оставляя только те slug, что
//     реально есть в каталоге. Даже если модель «нафантазирует» slug, он отсеется.

import type { PublicService } from "@/lib/services";
import { generateText, type AiResult } from "./client";

/** Одна рекомендация: услуга из каталога + причина от AI. */
export interface ServiceRecommendation {
  slug: string;
  title: string;
  organization: string | null;
  category: string | null;
  /** Короткое объяснение AI, почему услуга подходит под ситуацию. */
  reason: string;
}

const SYSTEM_PROMPT = `Ты — помощник Единого портала поддержки бизнеса холдинга «Байтерек».
Твоя задача — по описанию ситуации предпринимателя подобрать подходящие меры господдержки
СТРОГО из предоставленного каталога услуг.

Правила:
- Выбирай только услуги из списка. НИКОГДА не придумывай услуги, которых нет в каталоге.
- Предлагай от 1 до 3 самых релевантных услуг. Если подходящих нет — верни пустой массив.
- Для каждой услуги дай короткое (1–2 предложения) объяснение на русском, почему она
  подходит именно под эту ситуацию.
- Отвечай ТОЛЬКО валидным JSON-массивом, без markdown, без пояснений вне JSON.

Формат ответа — массив объектов:
[{"slug": "<slug из каталога>", "reason": "<почему подходит>"}]
Если ничего не подходит: []`;

/** Вытаскивает JSON-массив из ответа модели, даже если он обёрнут в текст/```-блок. */
function extractJsonArray(text: string): unknown {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function recommendServices(
  situation: string,
  catalog: PublicService[],
): Promise<AiResult<ServiceRecommendation[]>> {
  // Пустой каталог — подбирать не из чего, честно возвращаем «ничего не подошло».
  if (catalog.length === 0) return { ok: true, data: [] };

  // Индекс по slug — и для подсказки модели, и для последующей строгой фильтрации.
  const bySlug = new Map(catalog.map((s) => [s.slug, s]));

  const catalogText = catalog
    .map((s, i) => {
      const lines = [
        `${i + 1}. slug: ${s.slug}`,
        `   Название: ${s.title}`,
        s.category ? `   Направление: ${s.category}` : null,
        s.organization ? `   Организация: ${s.organization}` : null,
        s.description ? `   Описание: ${s.description}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  const user = `Каталог доступных услуг:\n\n${catalogText}\n\nСитуация предпринимателя: "${situation}"\n\nПодбери подходящие услуги из каталога.`;

  const result = await generateText({ system: SYSTEM_PROMPT, user, maxTokens: 700 });
  if (!result.ok) return result;

  const parsed = extractJsonArray(result.data);
  if (!Array.isArray(parsed)) return { ok: false, reason: "empty" };

  // Строгая фильтрация: только реальные slug из каталога, дедуп, максимум 3.
  const seen = new Set<string>();
  const recommendations: ServiceRecommendation[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const slug = (item as { slug?: unknown }).slug;
    const reason = (item as { reason?: unknown }).reason;
    if (typeof slug !== "string") continue;
    const service = bySlug.get(slug);
    if (!service || seen.has(slug)) continue;
    seen.add(slug);
    recommendations.push({
      slug: service.slug,
      title: service.title,
      organization: service.organization,
      category: service.category,
      reason: typeof reason === "string" && reason.trim() ? reason.trim() : "",
    });
    if (recommendations.length >= 3) break;
  }

  return { ok: true, data: recommendations };
}
