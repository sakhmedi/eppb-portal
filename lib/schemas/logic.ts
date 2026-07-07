// Zod-схемы для логики: условия видимости и расчётные формулы.
// Схемы — это «зеркало» типов из /types, но для проверки данных в рантайме.
// Аннотация z.ZodType<...> держит схему и тип синхронными: разойдутся — TS ругнётся.

import { z } from "zod";
import type { VisibilityRule, ConditionGroup } from "@/types";

export const conditionOperatorSchema = z.enum([
  "equals",
  "notEquals",
  "greaterThan",
  "greaterThanOrEqual",
  "lessThan",
  "lessThanOrEqual",
  "in",
  "contains",
  "isEmpty",
  "isNotEmpty",
]);

export const conditionSchema = z.object({
  field: z.string().min(1),
  operator: conditionOperatorSchema,
  value: z
    .union([
      z.string(),
      z.number(),
      z.boolean(),
      z.array(z.union([z.string(), z.number()])),
    ])
    .optional(),
});

// Правило и группа ссылаются друг на друга (рекурсия), поэтому z.lazy.
export const visibilityRuleSchema: z.ZodType<VisibilityRule> = z.lazy(() =>
  z.union([conditionSchema, conditionGroupSchema]),
);

export const conditionGroupSchema: z.ZodType<ConditionGroup> = z.lazy(() =>
  z.object({
    logic: z.enum(["and", "or"]),
    conditions: z.array(visibilityRuleSchema),
  }),
);

export const calculatedFormulaSchema = z.object({
  expression: z.string().min(1),
  dependsOn: z.array(z.string()),
});
