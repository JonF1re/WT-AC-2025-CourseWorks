import { z } from "zod";

export const attachmentCreateSchema = z.object({
  applicationId: z.string().uuid({ message: "Выберите заявку." }),
  filename: z.string().min(1, "Имя файла не может быть пустым."),
  mimeType: z.enum(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/png"]),
  fileSize: z.number().int().nonnegative().max(10 * 1024 * 1024, "Размер файла не должен превышать 10 МБ."),
  filePath: z.string().optional() // generated server-side
});

export const attachmentIdParamSchema = z.object({
  id: z.string().uuid()
});

export const attachmentQuerySchema = z.object({
  applicationId: z.string().uuid().optional()
});
