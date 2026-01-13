import { z } from "zod";

export const applicationCreateSchema = z.object({
  formId: z.string().uuid({ message: "Выберите форму заявки." }),
  data: z.record(z.any()),
  comment: z.string().max(5000).optional().nullable()
});

export const applicationUpdateSchema = z.object({
  data: z.record(z.any()).optional(),
  comment: z.string().max(5000).optional().nullable()
});

export const applicationIdParamSchema = z.object({
  id: z.string().uuid()
});

export const applicationListQuerySchema = z.object({
  statusId: z.string().uuid().optional(),
  formId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional()
});

export const applicationSubmitSchema = z.object({});

export const applicationStatusChangeSchema = z.object({
  statusId: z.string().uuid(),
  comment: z.string().max(5000).optional().nullable()
});

export const applicationWithdrawSchema = z.object({
  comment: z.string().max(5000).optional().nullable()
});
