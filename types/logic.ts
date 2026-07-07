// Бизнес-логика конструктора: ветвление (показать/скрыть) и расчётные поля.
// Эти типы описывают ПРАВИЛА, а не сам UI. Рендерер и калькулятор их исполняют.

/** Оператор сравнения для условий видимости. */
export type ConditionOperator =
  | "eq" // равно
  | "neq" // не равно
  | "gt" // больше
  | "gte" // больше или равно
  | "lt" // меньше
  | "lte" // меньше или равно
  | "in" // значение входит в список
  | "contains" // строка/массив содержит значение
  | "empty" // поле пустое
  | "notEmpty"; // поле заполнено

/** Одно элементарное условие: «поле `field` `operator` `value`». */
export interface Condition {
  /** `name` другого поля, от значения которого зависим. */
  field: string;
  operator: ConditionOperator;
  /** С чем сравниваем. Для операторов empty/notEmpty не нужно. */
  value?: string | number | boolean | Array<string | number>;
}

/**
 * Группа условий, объединённых логическим И / ИЛИ.
 * Может вкладываться в себя — так собираются сложные правила.
 */
export interface ConditionGroup {
  logic: "and" | "or";
  conditions: VisibilityRule[];
}

/** Правило видимости: либо одно условие, либо группа условий. */
export type VisibilityRule = Condition | ConditionGroup;

/**
 * Расчётное поле — его значение вычисляется, а не вводится руками.
 * `expression` — выражение над `name` полей, напр. "area * pricePerM2".
 * `dependsOn` — список полей из выражения (чтобы пересчитывать при их изменении).
 */
export interface CalculatedFormula {
  expression: string;
  dependsOn: string[];
}
