// Общие помощники и «человеческие» подписи для конструктора услуг.
// Отдельный модуль, чтобы подписи типов/операторов не расползались по компонентам.

import type { FieldType, ConditionOperator, Service, Field } from "@/types";

/** Тип поля → понятная бизнес-аналитику подпись. */
export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "textarea", label: "Многострочный текст" },
  { value: "number", label: "Число" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Телефон" },
  { value: "date", label: "Дата" },
  { value: "select", label: "Выпадающий список" },
  { value: "radio", label: "Переключатели" },
  { value: "checkbox", label: "Флажок (да/нет)" },
  { value: "file", label: "Файл" },
  { value: "iin", label: "ИИН (12 цифр)" },
  { value: "bin", label: "БИН (12 цифр)" },
  { value: "calculated", label: "Расчётное поле" },
];

export function fieldTypeLabel(type: FieldType): string {
  return FIELD_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

/** Оператор условия → подпись. */
export const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "equals", label: "равно" },
  { value: "notEquals", label: "не равно" },
  { value: "greaterThan", label: "больше" },
  { value: "greaterThanOrEqual", label: "больше или равно" },
  { value: "lessThan", label: "меньше" },
  { value: "lessThanOrEqual", label: "меньше или равно" },
  { value: "in", label: "входит в список" },
  { value: "contains", label: "содержит" },
  { value: "isEmpty", label: "пусто" },
  { value: "isNotEmpty", label: "заполнено" },
];

/** Операторы, которым не нужно значение. */
export const NO_VALUE_OPERATORS: ConditionOperator[] = ["isEmpty", "isNotEmpty"];

/** Все поля услуги плоским списком (для выбора поля-условия и в формулах). */
export function allFields(service: Service): Field[] {
  return service.steps.flatMap((s) => s.fields);
}

/** Поля, пригодные как аргументы формулы (числовые и расчётные). */
export function numericFields(service: Service): Field[] {
  return allFields(service).filter((f) => f.type === "number" || f.type === "calculated");
}

/** Сгенерировать уникальный key вида field1, field2… (латиница, с буквы). */
export function nextFieldKey(service: Service): string {
  const used = new Set(allFields(service).map((f) => f.key));
  let n = allFields(service).length + 1;
  let key = `field${n}`;
  while (used.has(key)) key = `field${++n}`;
  return key;
}

/** Короткий uuid для новых шагов/полей (в браузере есть crypto.randomUUID). */
export function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

/**
 * Привести введённое значение условия к типу поля-условия.
 * Важно для корректного сравнения в движке (=== в equals):
 * число сравнивается с числом, флажок — с boolean.
 */
export function coerceConditionValue(
  raw: string,
  fieldType: FieldType | undefined,
): string | number | boolean {
  if (fieldType === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  if (fieldType === "checkbox") {
    return raw === "true";
  }
  return raw;
}
