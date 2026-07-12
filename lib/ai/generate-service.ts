import "server-only";

// Функция 2: генерация ЧЕРНОВИКА структуры услуги по текстовому описанию (для конструктора).
// Автор пишет услугу словами → модель (Sonnet, качество структуры важнее цены) выдаёт JSON
// в нашем формате (этапы + поля с типами, ветвлением, формулами). Мы проставляем id, затем
// ВАЛИДИРУЕМ через serviceConfigSchema. В конструктор попадает только валидный черновик —
// человек его дорабатывает и публикует (автопубликации нет).

import { randomUUID } from "crypto";
import type { Step, Field } from "@/types";
import { serviceConfigSchema, fieldTypeSchema, conditionOperatorSchema } from "@/lib/schemas";
import { generateText, AI_MODEL_STRUCTURE } from "./client";
import { parseJsonObject } from "./parse";

/** Черновик, который подставляется в конструктор. Мета-поля необязательны (модель может
 * их не вернуть) — конструктор для отсутствующих оставляет текущие значения услуги. */
export interface GeneratedDraft {
  meta: {
    title?: string;
    description?: string;
    category?: string;
    organization?: string;
  };
  steps: Step[];
}

/**
 * Результат генерации. В отличие от общего AiResult, есть третий исход — `invalid`:
 * модель ответила, но структура не прошла нашу схему (показываем ошибку и предлагаем повтор).
 */
export type GenerateServiceResult =
  | { ok: true; data: GeneratedDraft }
  | { ok: false; reason: "unavailable" | "empty" | "invalid"; message?: string };

// Списки допустимых значений берём прямо из Zod-схем — промпт остаётся в синхроне со схемой.
const FIELD_TYPES = fieldTypeSchema.options.join(", ");
const OPERATORS = conditionOperatorSchema.options.join(", ");

const SYSTEM_PROMPT = `Ты — помощник автора услуг на no-code платформе господдержки бизнеса.
По текстовому описанию услуги ты составляешь ЧЕРНОВИК её структуры СТРОГО в JSON-формате
платформы. Твой ответ подставится в конструктор, где человек его доработает.

Верни ТОЛЬКО валидный JSON-объект (без markdown, без \`\`\`, без текста вокруг) такой формы:
{
  "title": "краткое название услуги",
  "description": "1–2 предложения",
  "category": "направление (например Субсидирование, Кредитование, Лизинг)",
  "organization": "организация, если ясна из описания",
  "steps": [
    {
      "title": "название этапа",
      "fields": [
        {
          "key": "loanAmount",
          "type": "number",
          "label": "Сумма кредита, ₸",
          "required": true,
          "validation": { "min": 0 }
        }
      ]
    }
  ]
}

Правила структуры:
- Тип поля "type" — строго одно из: ${FIELD_TYPES}.
- "key" — латиница/цифры/подчёркивание, начинается с буквы, человекочитаемый (loanAmount,
  companyBin, region). УНИКАЛЕН в пределах всей услуги.
- "label" — понятная подпись поля на русском.
- "options" (массив {"value","label"}) ОБЯЗАТЕЛЕН для типов select и radio.
- "validation": { "min", "max" } — для number это границы значения, для text — длина.
- Ветвление: "visibilityCondition" — поле видно только если условие истинно. Форма:
  { "field": "<key другого поля>", "operator": "<оператор>", "value": <значение> }
  либо группа { "logic": "and"|"or", "conditions": [ ... ] }.
  Оператор — строго одно из: ${OPERATORS}. "field" ссылается на "key" другого поля.
- Расчётные поля: "type":"calculated" + "formula": { "expression":"loanAmount * rate / 100",
  "dependsOn": ["loanAmount","rate"] }. В expression и dependsOn — только существующие "key".
- Документы делай полями "type":"file"; согласия — "type":"checkbox". Помещай их в ПОСЛЕДНИЕ
  этапы (отдельный этап документов и этап согласий) — так услуга корректно делится на фазы.
- НЕ добавляй поле "id" — платформа проставит идентификаторы сама.

Составляй разумную, аккуратную структуру строго по описанию; не выдумывай лишних полей.`;

/** Проставляем id шагам и полям, порядок — по индексу. id от модели игнорируем. */
function normalizeSteps(rawSteps: unknown[]): Step[] {
  return rawSteps.map((rawStep, i) => {
    const s = (rawStep ?? {}) as Record<string, unknown>;
    const rawFields = Array.isArray(s.fields) ? s.fields : [];
    const step: Step = {
      id: randomUUID(),
      title: typeof s.title === "string" ? s.title : `Этап ${i + 1}`,
      order: i + 1,
      fields: rawFields.map((rawField) => {
        const f = (rawField ?? {}) as Record<string, unknown>;
        // Наш id выигрывает у любого id, который мог прислать модель (спред идёт первым).
        return { ...f, id: randomUUID() } as unknown as Field;
      }),
    };
    if (s.visibilityCondition && typeof s.visibilityCondition === "object") {
      step.visibilityCondition = s.visibilityCondition as Step["visibilityCondition"];
    }
    return step;
  });
}

export async function generateServiceDraft(
  description: string,
): Promise<GenerateServiceResult> {
  const result = await generateText({
    system: SYSTEM_PROMPT,
    user: `Описание услуги от автора:\n\n${description}\n\nСоставь черновик структуры услуги.`,
    maxTokens: 4000,
    model: AI_MODEL_STRUCTURE,
  });
  if (!result.ok) return result; // unavailable | empty

  const raw = parseJsonObject(result.data);
  if (!raw) return { ok: false, reason: "invalid", message: "AI вернул не JSON-объект." };
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) {
    return { ok: false, reason: "invalid", message: "В ответе AI нет этапов услуги." };
  }

  const steps = normalizeSteps(raw.steps);
  const meta: GeneratedDraft["meta"] = {
    title: typeof raw.title === "string" ? raw.title : undefined,
    description: typeof raw.description === "string" ? raw.description : undefined,
    category: typeof raw.category === "string" ? raw.category : undefined,
    organization: typeof raw.organization === "string" ? raw.organization : undefined,
  };

  // Та же проверка, что и при публикации: уникальность key, ссылки условий/формул, формулы.
  const parsed = serviceConfigSchema.safeParse({
    title: meta.title || "Черновик услуги",
    description: meta.description,
    category: meta.category,
    organization: meta.organization,
    status: "draft",
    steps,
  });

  if (!parsed.success) {
    const message = Array.from(new Set(parsed.error.issues.map((i) => i.message)))
      .slice(0, 3)
      .join("; ");
    return { ok: false, reason: "invalid", message: message || "Структура не прошла проверку." };
  }

  return { ok: true, data: { meta, steps } };
}
