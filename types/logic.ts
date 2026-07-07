// Бизнес-логика конструктора: ветвление (показать/скрыть) и расчётные поля.
// Эти типы описывают ПРАВИЛА, а не сам UI. Рендерер и калькулятор их исполняют.

/** Оператор сравнения для условий видимости. */
export type ConditionOperator =
  | "equals" // равно
  | "notEquals" // не равно
  | "greaterThan" // больше
  | "greaterThanOrEqual" // больше или равно
  | "lessThan" // меньше
  | "lessThanOrEqual" // меньше или равно
  | "in" // значение входит в список
  | "contains" // строка/массив содержит значение
  | "isEmpty" // поле пустое
  | "isNotEmpty"; // поле заполнено

/** Одно элементарное условие: «поле `field` `operator` `value`». */
export interface Condition {
  /** `key` другого поля, от значения которого зависим (см. Field.key). */
  field: string;
  operator: ConditionOperator;
  /** С чем сравниваем. Для операторов isEmpty/isNotEmpty не нужно. */
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

/**
 * Правило видимости: либо одно условие, либо группа условий.
 * Простой услуге хватает одного Condition, сложной — вложенных групп and/or.
 */
export type VisibilityRule = Condition | ConditionGroup;

/**
 * Расчётное поле — его значение вычисляется, а не вводится руками.
 * `expression` — выражение над `key` полей, напр. "area * pricePerM2".
 * `dependsOn` — список полей (key) из выражения, чтобы пересчитывать при изменении.
 */
export interface CalculatedFormula {
  expression: string;
  dependsOn: string[];
}
