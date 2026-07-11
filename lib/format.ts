// Форматирование значений для отображения. Пока — расчётные (calculated) поля.
// Задача: убрать «хвосты» вида 16666,666666666 и показывать деньги как «16 667 ₸».
// Форматируем ТОЛЬКО отображение; хранимое значение остаётся точным (формулы на него опираются).

import type { Field } from "@/types";

// Метка денежного поля: единица измерения зашита в label (отдельного поля unit в модели нет).
const MONEY_MARKER = /₸|тенге|тг\b|kzt/i;

const moneyFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

/** Как показать значение расчётного поля пользователю. */
export function formatCalculatedValue(field: Field, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);

  // Денежное поле — округляем до целых тенге и показываем с разрядами и знаком валюты.
  if (MONEY_MARKER.test(field.label)) {
    return `${moneyFormatter.format(Math.round(num))} ₸`;
  }

  // Прочие числа — до двух знаков, с разделителями разрядов (без хвостов вроде ...6666).
  return numberFormatter.format(num);
}
