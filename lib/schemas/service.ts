// Zod-схема услуги целиком + перекрёстные проверки конфига конструктора.
// Именно этой схемой конструктор валидирует JSON перед сохранением в БД.

import { z } from "zod";
import { fieldSchema } from "./field";
import { visibilityRuleSchema } from "./logic";
import { collectRuleFields } from "@/lib/logic";
import { extractFormulaIdentifiers, FormulaError } from "@/lib/formula";

export const stepSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  order: z.number().int(),
  fields: z.array(fieldSchema),
  visibilityCondition: visibilityRuleSchema.optional(),
});

export const serviceStatusSchema = z.enum(["draft", "published"]);

// Базовый «объектный» уровень (без перекрёстных проверок).
const serviceObject = z.object({
  id: z.string(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug: строчные латинские буквы, цифры и дефис")
    .optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  organization: z.string().optional(),
  status: serviceStatusSchema,
  version: z.number().int().positive().optional(),
  steps: z.array(stepSchema).min(1, "У услуги должен быть хотя бы один шаг"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Перекрёстные проверки, которые нельзя выразить на уровне отдельного поля:
 *  1) `key` полей уникальны в пределах услуги;
 *  2) условия (visibilityCondition) и формулы (dependsOn/выражение)
 *     ссылаются только на существующие поля.
 */
function refineService(
  service: { steps: z.infer<typeof stepSchema>[] },
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>();
  const known = new Set<string>();

  service.steps.forEach((step) =>
    step.fields.forEach((f) => {
      if (seen.has(f.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Дублируется key поля: "${f.key}"`,
          path: ["steps"],
        });
      }
      seen.add(f.key);
      known.add(f.key);
    }),
  );

  const checkRefs = (fields: string[], where: string) =>
    fields.forEach((key) => {
      if (!known.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${where}: ссылка на неизвестное поле "${key}"`,
          path: ["steps"],
        });
      }
    });

  service.steps.forEach((step) => {
    if (step.visibilityCondition) {
      checkRefs(
        collectRuleFields(step.visibilityCondition),
        `Шаг "${step.title}"`,
      );
    }
    step.fields.forEach((f) => {
      if (f.visibilityCondition) {
        checkRefs(
          collectRuleFields(f.visibilityCondition),
          `Поле "${f.key}" (visibilityCondition)`,
        );
      }
      if (f.formula) {
        checkRefs(f.formula.dependsOn, `Поле "${f.key}" (формула)`);
        // Проверяем, что выражение вообще разбирается и ссылается на
        // существующие поля (ловим опечатки в формуле при сохранении услуги).
        try {
          checkRefs(
            extractFormulaIdentifiers(f.formula.expression),
            `Поле "${f.key}" (выражение)`,
          );
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Поле "${f.key}": ошибка в формуле — ${
              e instanceof FormulaError ? e.message : "неизвестная ошибка"
            }`,
            path: ["steps"],
          });
        }
      }
    });
  });
}

/** Полная услуга (как она лежит в БД, с id и датами). */
export const serviceSchema = serviceObject.superRefine(refineService);

/**
 * Конфиг услуги на этапе создания — без полей, которые проставляет БД
 * (id, version, createdAt, updatedAt). Удобно валидировать форму конструктора.
 */
export const serviceConfigSchema = serviceObject
  .omit({ id: true, version: true, createdAt: true, updatedAt: true })
  .superRefine(refineService);
