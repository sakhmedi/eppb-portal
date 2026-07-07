// Исполнитель бизнес-логики конструктора: вычисляет условия видимости.
// Эти функции — «мозг» ветвления. Их использует и рендерер формы,
// и генератор Zod-схемы (чтобы понимать, видно поле или нет).

import type {
  VisibilityRule,
  Condition,
  ConditionGroup,
  ApplicationFormData,
} from "@/types";

/** Правило — это группа (and/or), а не одиночное условие? */
function isGroup(rule: VisibilityRule): rule is ConditionGroup {
  return (rule as ConditionGroup).logic !== undefined;
}

/** Считаем значение «пустым» (для операторов isEmpty/isNotEmpty и проверки required). */
export function isEmptyValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

/** Собрать все `key` полей, на которые ссылается правило (рекурсивно). */
export function collectRuleFields(rule: VisibilityRule): string[] {
  if (isGroup(rule)) return rule.conditions.flatMap(collectRuleFields);
  return [rule.field];
}

/** Проверить одно элементарное условие против данных заявки. */
export function evaluateCondition(
  cond: Condition,
  data: ApplicationFormData,
): boolean {
  const left = data[cond.field];
  const right = cond.value;

  switch (cond.operator) {
    case "equals":
      return left === right;
    case "notEquals":
      return left !== right;
    case "greaterThan":
      return Number(left) > Number(right);
    case "greaterThanOrEqual":
      return Number(left) >= Number(right);
    case "lessThan":
      return Number(left) < Number(right);
    case "lessThanOrEqual":
      return Number(left) <= Number(right);
    case "in":
      return Array.isArray(right) && right.includes(left as string | number);
    case "contains":
      return Array.isArray(left)
        ? left.includes(right as never)
        : String(left ?? "").includes(String(right ?? ""));
    case "isEmpty":
      return isEmptyValue(left);
    case "isNotEmpty":
      return !isEmptyValue(left);
    default:
      return false;
  }
}

/** Проверить правило целиком (с учётом вложенных and/or групп). */
export function evaluateRule(
  rule: VisibilityRule,
  data: ApplicationFormData,
): boolean {
  if (!isGroup(rule)) return evaluateCondition(rule, data);
  return rule.logic === "and"
    ? rule.conditions.every((c) => evaluateRule(c, data))
    : rule.conditions.some((c) => evaluateRule(c, data));
}

/** Видно ли поле/шаг: если правила нет — видно всегда. */
export function isVisible(
  rule: VisibilityRule | undefined,
  data: ApplicationFormData,
): boolean {
  return rule ? evaluateRule(rule, data) : true;
}
