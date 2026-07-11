// Расшифровка ответов заявки для показа человеку: label поля → читаемое значение,
// а не сырой key → сырое значение. Используется страницей отдельной заявки.
//
// Server-safe: опции select/radio разрешаем локально (field.options или справочник),
// НЕ импортируя код рендерера (components/renderer/*), чтобы не тянуть клиентские
// зависимости в серверный бандл. Числа/деньги форматируем через lib/format.

import type {
  Service,
  Field,
  ApplicationFormData,
  ApplicationDocument,
  ReferenceOption,
  ID,
} from "@/types";
import { formatCalculatedValue, formatDate } from "@/lib/format";

/** Плоская карта key → Field по всем шагам услуги (порядок сохраняем). */
export function flattenFields(service: Service): Map<string, Field> {
  const map = new Map<string, Field>();
  const steps = [...service.steps].sort((a, b) => a.order - b.order);
  for (const step of steps) {
    for (const field of step.fields) map.set(field.key, field);
  }
  return map;
}

/** Варианты выбора поля: заданы прямо в поле или подтянуты из справочника. */
function optionsFor(field: Field, references: Record<ID, ReferenceOption[]>): { value: string; label: string }[] {
  if (field.options && field.options.length > 0) return field.options;
  if (field.referenceId) return references[field.referenceId] ?? [];
  return [];
}

const EMPTY = "—";

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/**
 * Значение одного поля в человекочитаемом виде.
 * Для file берём имя файла из documents (значение в formData — это storagePath).
 */
export function formatFieldValue(
  field: Field,
  value: unknown,
  documents: ApplicationDocument[],
  references: Record<ID, ReferenceOption[]>,
): string {
  if (field.type === "file") {
    const doc = documents.find((d) => d.fieldKey === field.key);
    if (doc) return doc.fileName;
    if (isEmpty(value)) return EMPTY;
    // Значение — путь в Storage (uid/app/field/1712345678-имя.pdf). Показываем только имя
    // файла без служебного префикса-времени, если запись documents ещё не появилась.
    const base = String(value).split("/").pop() ?? String(value);
    return base.replace(/^\d+-/, "");
  }
  if (isEmpty(value)) return EMPTY;

  switch (field.type) {
    case "select":
    case "radio": {
      const opt = optionsFor(field, references).find((o) => o.value === String(value));
      return opt?.label ?? String(value);
    }
    case "checkbox":
      return value ? "Да" : "Нет";
    case "date":
      return formatDate(String(value));
    case "number":
    case "calculated":
      return formatCalculatedValue(field, value);
    default:
      return String(value);
  }
}

/** Готовая строка для показа: подпись поля и его читаемое значение. */
export interface AnswerRow {
  key: string;
  label: string;
  value: string;
}

/**
 * Строки «label → значение» по всем полям услуги, в порядке шагов.
 * Пропускаем calculated без значения и незаполненные необязательные поля,
 * чтобы не засорять карточку пустыми «—» (заполненные показываем все).
 */
export function buildAnswerRows(
  service: Service,
  formData: ApplicationFormData,
  documents: ApplicationDocument[],
  references: Record<ID, ReferenceOption[]>,
): AnswerRow[] {
  const rows: AnswerRow[] = [];
  const steps = [...service.steps].sort((a, b) => a.order - b.order);
  for (const step of steps) {
    for (const field of step.fields) {
      const hasFile =
        field.type === "file" && documents.some((d) => d.fieldKey === field.key);
      if (isEmpty(formData[field.key]) && !hasFile) continue;
      rows.push({
        key: field.key,
        label: field.label,
        value: formatFieldValue(field, formData[field.key], documents, references),
      });
    }
  }
  return rows;
}
