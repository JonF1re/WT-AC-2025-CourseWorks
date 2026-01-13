import { z } from "zod";

export const formCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  fields: z.array(z.any()).min(1, "Форма должна содержать хотя бы одно поле."),
  isActive: z.boolean().optional()
});

export const formUpdateSchema = formCreateSchema.partial();

export const formIdParamSchema = z.object({
  id: z.string().uuid()
});

export const formListQuerySchema = z.object({
  isActive: z.string().optional()
});
