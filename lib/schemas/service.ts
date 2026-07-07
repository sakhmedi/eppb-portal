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
  description: z.string().optional(),
  order: z.number().int(),
  fields: z.array(fieldSchema),
  visibleIf: visibilityRuleSchema.optional(),
});

export const serviceStatusSchema = z.enum(["draft", "published", "archived"]);

// Базовый «объектный» уровень (без перекрёстных проверок).
const serviceObject = z.object({
  id: z.string(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "slug: строчные латинские буквы, цифры и дефис"),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  organization: z.string().optional(),
  status: serviceStatusSchema,
  version: z.number().int().positive(),
  steps: z.array(stepSchema).min(1, "У услуги должен быть хотя бы один шаг"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Перекрёстные проверки, которые нельзя выразить на уровне отдельного поля:
 *  1) `name` полей уникальны в пределах услуги;
 *  2) условия (visibleIf) и формулы (dependsOn) ссылаются только на
 *     существующие поля.
 */
function refineService(
  service: { steps: z.infer<typeof stepSchema>[] },
  ctx: z.RefinementCtx,
) {
  const seen = new Set<string>();
  const known = new Set<string>();

  service.steps.forEach((step) =>
    step.fields.forEach((f) => {
      if (seen.has(f.name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Дублируется name поля: "${f.name}"`,
          path: ["steps"],
        });
      }
      seen.add(f.name);
      known.add(f.name);
    }),
  );

  const checkRefs = (fields: string[], where: string) =>
    fields.forEach((name) => {
      if (!known.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${where}: ссылка на неизвестное поле "${name}"`,
          path: ["steps"],
        });
      }
    });

  service.steps.forEach((step) => {
    if (step.visibleIf) {
      checkRefs(collectRuleFields(step.visibleIf), `Шаг "${step.title}"`);
    }
    step.fields.forEach((f) => {
      if (f.visibleIf) {
        checkRefs(collectRuleFields(f.visibleIf), `Поле "${f.name}" (visibleIf)`);
      }
      if (f.calculated) {
        checkRefs(f.calculated.dependsOn, `Поле "${f.name}" (формула)`);
        // Проверяем, что выражение вообще разбирается и ссылается на
        // существующие поля (ловим опечатки в формуле при сохранении услуги).
        try {
          checkRefs(
            extractFormulaIdentifiers(f.calculated.expression),
            `Поле "${f.name}" (выражение)`,
          );
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Поле "${f.name}": ошибка в формуле — ${
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
