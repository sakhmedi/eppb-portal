// Zod-схема пользователя.

import { z } from "zod";

export const userRoleSchema = z.enum(["applicant", "operator", "admin"]);

const iinBin = z.string().regex(/^\d{12}$/, "Должно быть 12 цифр");

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  fullName: z.string().optional(),
  iin: iinBin.optional(),
  bin: iinBin.optional(),
  role: userRoleSchema,
  organizationId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
