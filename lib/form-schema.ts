// Генератор Zod-схемы для ЗАПОЛНЕННОЙ формы (Application.formData).
//
// Схему конкретной услуги нельзя написать заранее — набор полей у каждой услуги
// свой. Поэтому мы СТРОИМ её из конфига услуги во время работы:
//   const schema = buildFormSchema(service);
//   const result = schema.safeParse(applicationFormData);
//
// Тонкость: обязательность поля (required) проверяется только если поле ВИДНО
// (с учётом visibilityCondition самого поля и его шага). Скрытое поле не обязано
// быть заполненным — это и есть корректная условная валидация.

import { z } from "zod";
import type { Field, Service, ApplicationFormData } from "@/types";
import { isEmptyValue, isVisible } from "./logic";

/** Базовая схема значения ОДНОГО поля — без учёта обязательности. */
function fieldValueSchema(field: Field): z.ZodTypeAny {
  const v = field.validation;

  switch (field.type) {
    case "number": {
      let s = z.coerce.number();
      if (v?.min !== undefined) s = s.min(v.min);
      if (v?.max !== undefined) s = s.max(v.max);
      return s;
    }
    case "checkbox":
      return z.boolean();
    case "email":
      return z.string().email();
    case "iin":
    case "bin":
      return z.string().regex(/^\d{12}$/, "Должно быть 12 цифр");
    case "select":
    case "radio":
      // Если варианты заданы прямо в поле — ограничиваем ими.
      if (field.options?.length) {
        return z.enum(
          field.options.map((o) => o.value) as [string, ...string[]],
        );
      }
      // Иначе значения приходят из справочника — проверить сможем позже.
      return z.string();
    case "file":
      return z.string(); // путь к файлу в Supabase Storage
    default: {
      // text / textarea / phone / date
      let s = z.string();
      if (v?.min !== undefined) s = s.min(v.min);
      if (v?.max !== undefined) s = s.max(v.max);
      if (v?.pattern) s = s.regex(new RegExp(v.pattern), v.message);
      return s;
    }
  }
}

/** Пустую строку трактуем как «значения нет», чтобы не срабатывала лишняя валидация. */
function optionalValue(schema: z.ZodTypeAny): z.ZodTypeAny {
  return z.preprocess((val) => (val === "" ? undefined : val), schema.optional());
}

/**
 * Строит Zod-схему для данных заявки по конфигу услуги.
 * Расчётные поля пропускаются — их считает сервер, а не пользователь.
 */
export function buildFormSchema(service: Service) {
  const shape: Record<string, z.ZodTypeAny> = {};
  // Запоминаем поля и правило видимости их шага для проверки required.
  const editable: Array<{
    field: Field;
    stepRule: Field["visibilityCondition"];
  }> = [];

  for (const step of service.steps) {
    for (const field of step.fields) {
      if (field.type === "calculated") continue; // расчётное поле не вводят руками
      shape[field.key] = optionalValue(fieldValueSchema(field));
      editable.push({ field, stepRule: step.visibilityCondition });
    }
  }

  return z.object(shape).superRefine((data, ctx) => {
    const values = data as ApplicationFormData;
    for (const { field, stepRule } of editable) {
      const visible =
        isVisible(stepRule, values) &&
        isVisible(field.visibilityCondition, values);
      if (field.required && visible && isEmptyValue(values[field.key])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: field.validation?.message ?? "Обязательное поле",
          path: [field.key],
        });
      }
    }
  });
}
