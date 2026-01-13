import type { Request, Response } from "express";
import { statusCreateSchema, statusIdParamSchema, statusUpdateSchema } from "./statuses.schemas.js";
import { createStatus, deleteStatus, getStatus, listStatuses, updateStatus } from "./statuses.service.js";

export const listStatusesHandler = async (_req: Request, res: Response) => {
  const statuses = await listStatuses();
  res.json({ status: "ok", data: statuses });
};

export const getStatusHandler = async (req: Request, res: Response) => {
  const params = statusIdParamSchema.parse(req.params);
  const status = await getStatus(params.id);
  res.json({ status: "ok", data: status });
};

export const createStatusHandler = async (req: Request, res: Response) => {
  const input = statusCreateSchema.parse(req.body);
  const status = await createStatus(input);
  res.status(201).json({ status: "ok", data: status });
};

export const updateStatusHandler = async (req: Request, res: Response) => {
  const params = statusIdParamSchema.parse(req.params);
  const input = statusUpdateSchema.parse(req.body);
  const status = await updateStatus(params.id, input);
  res.json({ status: "ok", data: status });
};

export const deleteStatusHandler = async (req: Request, res: Response) => {
  const params = statusIdParamSchema.parse(req.params);
  await deleteStatus(params.id);
  res.status(204).send();
};
