import { z } from "zod";

export const statusCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().regex(/^#?[0-9a-fA-F]{6}$/).optional().nullable(),
  order: z.number().int().nonnegative().optional(),
  isFinal: z.boolean().optional()
});

export const statusUpdateSchema = statusCreateSchema.partial();

export const statusIdParamSchema = z.object({
  id: z.string().uuid()
});
