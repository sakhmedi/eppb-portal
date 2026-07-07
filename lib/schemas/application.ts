// Zod-схема заявки (для валидации записи на API/в БД).
// Внимание: `data` здесь проверяется лишь как «словарь» — конкретные поля
// валидируются схемой из buildFormSchema (см. lib/form-schema.ts),
// потому что их набор зависит от конкретной услуги.

import { z } from "zod";

export const applicationStatusSchema = z.enum([
  "draft",
  "submitted",
  "in_review",
  "approved",
  "rejected",
]);

export const applicationDocumentSchema = z.object({
  id: z.string(),
  fieldName: z.string(),
  fileName: z.string(),
  storagePath: z.string(),
  uploadedAt: z.string(),
});

export const applicationStatusChangeSchema = z.object({
  status: applicationStatusSchema,
  changedBy: z.string(),
  changedAt: z.string(),
  comment: z.string().optional(),
});

export const applicationSchema = z.object({
  id: z.string(),
  serviceId: z.string(),
  serviceVersion: z.number().int().positive(),
  applicantId: z.string(),
  status: applicationStatusSchema,
  data: z.record(z.string(), z.unknown()),
  documents: z.array(applicationDocumentSchema),
  history: z.array(applicationStatusChangeSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
