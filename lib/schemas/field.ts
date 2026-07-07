// Zod-схема поля формы + проверка, что select/radio/multiselect имеют варианты.

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
  "multiselect",
  "file",
  "iin",
  "bin",
]);

export const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const fieldValidationSchema = z.object({
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  message: z.string().optional(),
});

/** Типы, которым обязательно нужны варианты выбора. */
const CHOICE_TYPES: readonly string[] = ["select", "radio", "multiselect"];

export const fieldSchema = z
  .object({
    id: z.string(),
    name: z
      .string()
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        "name: латиница/цифры/_, начинается с буквы",
      ),
    type: fieldTypeSchema,
    label: z.string().min(1),
    placeholder: z.string().optional(),
    helpText: z.string().optional(),
    defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    validation: fieldValidationSchema.optional(),
    options: z.array(fieldOptionSchema).optional(),
    referenceCode: z.string().optional(),
    visibleIf: visibilityRuleSchema.optional(),
    calculated: calculatedFormulaSchema.optional(),
  })
  .superRefine((field, ctx) => {
    // У поля выбора должны быть либо options, либо ссылка на справочник.
    if (
      CHOICE_TYPES.includes(field.type) &&
      !field.options?.length &&
      !field.referenceCode
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Поле "${field.name}" (${field.type}) требует options или referenceCode`,
        path: ["options"],
      });
    }
  });
