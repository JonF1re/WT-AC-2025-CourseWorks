import type { Request, Response } from "express";
import {
  applicationCreateSchema,
  applicationIdParamSchema,
  applicationListQuerySchema,
  applicationStatusChangeSchema,
  applicationUpdateSchema,
  applicationWithdrawSchema
} from "./applications.schemas.js";
import {
  changeApplicationStatus,
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  submitApplication,
  updateApplication,
  withdrawApplication
} from "./applications.service.js";
import { AppError } from "../../lib/errors.js";

export const listApplicationsHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const query = applicationListQuerySchema.parse(req.query);
  const result = await listApplications(req.user, query);
  res.json({ status: "ok", data: { items: result.items, page: result.page, pageSize: result.pageSize, total: result.total } });
};

export const getApplicationHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = applicationIdParamSchema.parse(req.params);
  const app = await getApplication(params.id, req.user);
  res.json({ status: "ok", data: app });
};

export const createApplicationHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const input = applicationCreateSchema.parse(req.body);
  const app = await createApplication(input, req.user);
  res.status(201).json({ status: "ok", data: app });
};

export const updateApplicationHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = applicationIdParamSchema.parse(req.params);
  const input = applicationUpdateSchema.parse(req.body);
  const app = await updateApplication(params.id, input, req.user);
  res.json({ status: "ok", data: app });
};

export const deleteApplicationHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = applicationIdParamSchema.parse(req.params);
  await deleteApplication(params.id, req.user);
  res.status(204).send();
};

export const submitApplicationHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = applicationIdParamSchema.parse(req.params);
  const app = await submitApplication(params.id, req.user);
  res.json({ status: "ok", data: app });
};

export const changeStatusHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = applicationIdParamSchema.parse(req.params);
  const input = applicationStatusChangeSchema.parse(req.body);
  const app = await changeApplicationStatus(params.id, input, req.user);
  res.json({ status: "ok", data: app });
};

export const withdrawApplicationHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const params = applicationIdParamSchema.parse(req.params);
  const _body = applicationWithdrawSchema.parse(req.body ?? {});
  const app = await withdrawApplication(params.id, req.user);
  res.json({ status: "ok", data: app });
};
