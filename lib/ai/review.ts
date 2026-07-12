import "server-only";

// Функция 1: проверка заявки перед отправкой (AI-ассистент).
// Смотрит на ЗАПОЛНЕННЫЕ данные в контексте полей и условий услуги и находит вероятные
// проблемы: пустые важные поля, подозрительные значения (сумма 0, срок больше максимума,
// неполный телефон), несостыковки. Возвращает список замечаний простым языком.
//
// ВАЖНО: это ПОМОЩЬ, а не блокировка. Формальную валидацию делает Zod (buildFormSchema) при
// отправке; AI её дополняет, а не заменяет. Если AI недоступен — подача не страдает.

import type { Service, Field, ApplicationFormData } from "@/types";
import { isVisible, isEmptyValue } from "@/lib/logic";
import { generateText, type AiResult } from "./client";
import { parseJsonArray } from "./parse";

const SYSTEM_PROMPT = `Ты — внимательный ассистент, который помогает предпринимателю проверить
заявку перед отправкой в организацию господдержки. Тебе дают список полей заявки с их типами,
ограничениями, обязательностью и введёнными значениями.

Твоя задача — найти вероятные проблемы и мягко подсказать, что стоит перепроверить:
- обязательные поля, оставленные пустыми;
- значения, которые выглядят подозрительно (например сумма 0, срок больше допустимого
  максимума, явно неполный номер телефона, дата в прошлом там, где ожидается будущая);
- несостыковки между полями.

Правила:
- Это ПОМОЩЬ, а не запрет: ты советуешь перепроверить, но не запрещаешь подать заявку.
- Опирайся ТОЛЬКО на предоставленные поля и значения. Не выдумывай требований, которых нет.
- Пиши по-русски, коротко и доброжелательно, каждое замечание — одно короткое предложение.
- Если всё выглядит нормально — верни пустой массив.
- Ответь ТОЛЬКО валидным JSON-массивом строк, без markdown и пояснений вне JSON.
  Пример: ["Поле «Сумма кредита» не заполнено — укажите сумму.", "Срок 72 мес. больше максимума 60."]`;

/** Человекочитаемое значение поля для промпта (без «сырых» путей к файлам и т.п.). */
function describeValue(field: Field, value: unknown): string {
  if (field.type === "file") {
    return isEmptyValue(value) ? "(файл не приложен)" : "(файл приложен)";
  }
  if (field.type === "checkbox") {
    return value === true ? "да (отмечено)" : "нет (не отмечено)";
  }
  if (isEmptyValue(value)) return "(пусто)";
  // Для select/radio показываем подпись варианта, если она есть.
  if ((field.type === "select" || field.type === "radio") && field.options?.length) {
    const opt = field.options.find((o) => o.value === value);
    if (opt) return opt.label;
  }
  return String(value);
}

/** Ограничения поля в текст: обязательность и min/max. */
function describeConstraints(field: Field): string {
  const parts: string[] = [];
  if (field.required) parts.push("обязательное");
  if (field.validation?.min !== undefined) parts.push(`min ${field.validation.min}`);
  if (field.validation?.max !== undefined) parts.push(`max ${field.validation.max}`);
  return parts.join(", ") || "—";
}

export async function reviewApplication(
  stageService: Service,
  formData: ApplicationFormData,
): Promise<AiResult<string[]>> {
  // Собираем контекст ТОЛЬКО из видимых (с учётом ответов) не-расчётных полей: скрытые
  // ветвлением поля не относятся к заявке, расчётные считает система.
  const lines: string[] = [];
  for (const step of stageService.steps) {
    const stepVisible = isVisible(step.visibilityCondition, formData);
    if (!stepVisible) continue;
    for (const field of step.fields) {
      if (field.type === "calculated") continue;
      if (!isVisible(field.visibilityCondition, formData)) continue;
      lines.push(
        `- «${field.label}» (тип: ${field.type}; ${describeConstraints(field)}) = ${describeValue(
          field,
          formData[field.key],
        )}`,
      );
    }
  }

  if (lines.length === 0) return { ok: true, data: [] };

  const user = `Услуга: ${stageService.title}\n\nПоля заявки и введённые значения:\n${lines.join(
    "\n",
  )}\n\nНайди вероятные проблемы и верни массив коротких замечаний (или пустой массив).`;

  const result = await generateText({ system: SYSTEM_PROMPT, user, maxTokens: 600 });
  if (!result.ok) return result;

  const parsed = parseJsonArray(result.data);
  if (!parsed) return { ok: false, reason: "empty" };

  // Оставляем только непустые строки, максимум 8 замечаний.
  const remarks = parsed
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, 8);

  return { ok: true, data: remarks };
}
