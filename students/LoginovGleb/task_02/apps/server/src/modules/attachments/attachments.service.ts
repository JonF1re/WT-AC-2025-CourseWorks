import { randomUUID } from "crypto";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

const MAX_ATTACHMENTS = 10;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB

const sanitizeFilename = (name: string) => name.replace(/\\/g, "").replace(/\//g, "");

const ensurePermission = async (currentUser: { id: string; role: string }, applicationId: string) => {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { status: true }
  });
  if (!app) throw new AppError(404, "Application not found", "not_found");
  const isOwner = app.userId === currentUser.id;
  if (!(isOwner || currentUser.role === "admin" || currentUser.role === "moderator")) {
    throw new AppError(403, "Forbidden", "forbidden");
  }
  return app;
};

export const listAttachments = async (
  currentUser: { id: string; role: string },
  filter: { applicationId?: string }
) => {
  const where: any = {};
  if (filter.applicationId) where.applicationId = filter.applicationId;
  if (filter.applicationId) {
    await ensurePermission(currentUser, filter.applicationId);
  } else if (currentUser.role === "user") {
    // Users can only see their own attachments via their applications
    throw new AppError(400, "applicationId is required", "validation_failed");
  }

  return prisma.attachment.findMany({ where, orderBy: { uploadedAt: "desc" } });
};

export const getAttachment = async (id: string, currentUser: { id: string; role: string }) => {
  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) throw new AppError(404, "Attachment not found", "not_found");
  await ensurePermission(currentUser, attachment.applicationId);
  return attachment;
};

export const createAttachment = async (
  input: { applicationId: string; filename: string; mimeType: string; fileSize: number },
  currentUser: { id: string; role: string }
) => {
  const app = await ensurePermission(currentUser, input.applicationId);
  if (currentUser.role === "moderator") {
    throw new AppError(403, "Forbidden", "forbidden");
  }
  if (currentUser.role !== "admin" && app.status?.name !== "draft") {
    throw new AppError(403, "Attachments allowed only for draft applications", "forbidden");
  }

  const count = await prisma.attachment.count({ where: { applicationId: input.applicationId } });
  if (count >= MAX_ATTACHMENTS) {
    throw new AppError(400, "Превышен лимит вложений (максимум 10 файлов).", "validation_failed");
  }

  const aggregate = await prisma.attachment.aggregate({
    _sum: { fileSize: true },
    where: { applicationId: input.applicationId }
  });
  const currentTotal = aggregate._sum.fileSize ?? 0;
  if (currentTotal + input.fileSize > MAX_TOTAL_SIZE) {
    throw new AppError(400, "Превышен общий размер вложений (максимум 50 МБ).", "validation_failed");
  }

  const path = `uploads/${input.applicationId}/${randomUUID()}-${sanitizeFilename(input.filename)}`;

  const attachment = await prisma.attachment.create({
    data: {
      applicationId: input.applicationId,
      filename: input.filename,
      filePath: path,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      uploadedById: currentUser.id
    }
  });
  logger.info({ attachmentId: attachment.id, applicationId: input.applicationId, userId: currentUser.id }, "attachment created");
  return attachment;
};

export const deleteAttachment = async (id: string, currentUser: { id: string; role: string }) => {
  const attachment = await prisma.attachment.findUnique({ where: { id }, include: { application: { include: { status: true } } } });
  if (!attachment) throw new AppError(404, "Attachment not found", "not_found");
  const app = attachment.application;
  const isOwner = app.userId === currentUser.id;
  if (!(isOwner || currentUser.role === "admin")) {
    throw new AppError(403, "Forbidden", "forbidden");
  }
  if (currentUser.role !== "admin" && app.status?.name !== "draft") {
    throw new AppError(403, "Attachments can be removed only in draft", "forbidden");
  }

  await prisma.attachment.delete({ where: { id } });
  logger.info({ attachmentId: id, applicationId: app.id, userId: currentUser.id }, "attachment deleted");
};
