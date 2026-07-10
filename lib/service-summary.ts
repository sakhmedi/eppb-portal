// Выжимка «фактов» услуги для карточки /services/[slug].
// Всё считается ИЗ JSON-конфига услуги (steps/fields) — никакого хардкода под конкретную
// услугу. Поэтому карточка одинаково работает для любой опубликованной услуги.

import type { Service } from "@/types";
import { isVisible } from "@/lib/logic";

/** Документ, который понадобится при подаче (выведен из поля type === "file"). */
export interface ServiceDocument {
  label: string;
  hint?: string;
  /** Обязательный ли документ. */
  required: boolean;
  /** Нужен не всегда — зависит от ответов в форме (у поля/шага есть условие показа). */
  conditional: boolean;
}

/** Готовые факты услуги для отображения на карточке. */
export interface ServiceFacts {
  /** Заголовки шагов, видимых на старте (без заполнения формы), по порядку. */
  stepTitles: string[];
  stepCount: number;
  /** Сколько полей заполняет пользователь (без авто-расчётных). */
  inputFieldCount: number;
  /** Документы, которые понадобятся (по полям-файлам, дедуп по названию). */
  documents: ServiceDocument[];
  /** Что посчитается автоматически (поля type === "calculated"). */
  calculatedOutputs: { label: string }[];
}

/** Правильное склонение слова «шаг» по числу: 1 шаг, 2 шага, 5 шагов. */
export function pluralSteps(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "шаг";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "шага";
  return "шагов";
}

/**
 * Собирает факты услуги из её конфига.
 * «Стартовая» видимость шагов оценивается при пустых ответах (data = {}):
 * шаги/поля без условий видны, условные — скрыты.
 */
export function getServiceFacts(service: Service): ServiceFacts {
  const steps = [...service.steps].sort((a, b) => a.order - b.order);

  const visibleSteps = steps.filter((s) => isVisible(s.visibilityCondition, {}));
  const stepTitles = visibleSteps.map((s) => s.title);

  let inputFieldCount = 0;
  const calculatedOutputs: { label: string }[] = [];
  // Дедуп документов по label: у разных веток заявителя часто повторяются одинаковые
  // документы (напр. «Налоговая декларация»), незачем показывать их дважды.
  const docsByLabel = new Map<string, ServiceDocument>();

  for (const step of steps) {
    const stepConditional = step.visibilityCondition !== undefined;
    for (const field of step.fields) {
      if (field.type === "calculated") {
        calculatedOutputs.push({ label: field.label });
        continue;
      }

      inputFieldCount += 1;

      if (field.type === "file") {
        const conditional = stepConditional || field.visibilityCondition !== undefined;
        const existing = docsByLabel.get(field.label);
        if (existing) {
          // Если тот же документ где-то обязателен — считаем обязательным;
          // если хоть где-то безусловен — считаем безусловным.
          existing.required = existing.required || !!field.required;
          existing.conditional = existing.conditional && conditional;
          existing.hint = existing.hint ?? field.hint;
        } else {
          docsByLabel.set(field.label, {
            label: field.label,
            hint: field.hint,
            required: !!field.required,
            conditional,
          });
        }
      }
    }
  }

  return {
    stepTitles,
    stepCount: stepTitles.length,
    inputFieldCount,
    documents: Array.from(docsByLabel.values()),
    calculatedOutputs,
  };
}
