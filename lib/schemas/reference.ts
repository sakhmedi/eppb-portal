// Zod-схема справочника.

import { z } from "zod";

export const referenceItemSchema = z.object({
  value: z.string(),
  label: z.string(),
  parentValue: z.string().optional(),
});

export const referenceSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  title: z.string().min(1),
  items: z.array(referenceItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
