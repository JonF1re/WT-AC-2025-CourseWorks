import type { Request, Response } from "express";
import { attachmentCreateSchema, attachmentIdParamSchema, attachmentQuerySchema } from "./attachments.schemas.js";
import { createAttachment, deleteAttachment, getAttachment, listAttachments } from "./attachments.service.js";
import { AppError } from "../../lib/errors.js";

export const listAttachmentsHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const query = attachmentQuerySchema.parse(req.query);
  const attachments = await listAttachments(req.user, query);
  res.json({ status: "ok", data: attachments });
};

export const getAttachmentHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = attachmentIdParamSchema.parse(req.params);
  const attachment = await getAttachment(params.id, req.user);
  res.json({ status: "ok", data: attachment });
};

export const createAttachmentHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const input = attachmentCreateSchema.parse(req.body);
  const attachment = await createAttachment(input, req.user);
  res.status(201).json({ status: "ok", data: attachment });
};

export const deleteAttachmentHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = attachmentIdParamSchema.parse(req.params);
  await deleteAttachment(params.id, req.user);
  res.status(204).send();
};
