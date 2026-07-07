// Zod-схема поля формы + проверки:
//  - у select/radio должны быть варианты (options или ссылка на справочник);
//  - у поля type==="calculated" должна быть формула.

import { z } from "zod";
import { visibilityRuleSchema, calculatedFormulaSchema } from "./logic";

export const fieldTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "email",
  "phone",
  "date",
  "select",
  "radio",
  "checkbox",
  "file",
  "iin",
  "bin",
  "calculated",
]);

export const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const fieldValidationSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

/** Типы, которым обязательно нужны варианты выбора. */
const CHOICE_TYPES: readonly string[] = ["select", "radio"];

export const fieldSchema = z
  .object({
    id: z.string(),
    key: z
      .string()
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        "key: латиница/цифры/_, начинается с буквы",
      ),
    type: fieldTypeSchema,
    label: z.string().min(1),
    placeholder: z.string().optional(),
    hint: z.string().optional(),
    required: z.boolean().optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    validation: fieldValidationSchema.optional(),
    options: z.array(fieldOptionSchema).optional(),
    referenceId: z.string().optional(),
    visibilityCondition: visibilityRuleSchema.optional(),
    formula: calculatedFormulaSchema.optional(),
  })
  .superRefine((field, ctx) => {
    // У поля выбора должны быть либо options, либо ссылка на справочник.
    if (
      CHOICE_TYPES.includes(field.type) &&
      !field.options?.length &&
      !field.referenceId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Поле "${field.key}" (${field.type}) требует options или referenceId`,
        path: ["options"],
      });
    }
    // Расчётное поле обязано иметь формулу.
    if (field.type === "calculated" && !field.formula) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Поле "${field.key}" (calculated) требует formula`,
        path: ["formula"],
      });
    }
  });
