// Zod-схема справочника.

import { z } from "zod";

export const referenceOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  parentValue: z.string().optional(),
});

export const referenceSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  options: z.array(referenceOptionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
