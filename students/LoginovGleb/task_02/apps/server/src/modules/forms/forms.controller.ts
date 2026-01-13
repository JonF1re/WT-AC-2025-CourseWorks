import type { Request, Response } from "express";
import { formCreateSchema, formIdParamSchema, formListQuerySchema, formUpdateSchema } from "./forms.schemas.js";
import { createForm, deleteForm, getFormById, listForms, updateForm } from "./forms.service.js";
import { AppError } from "../../lib/errors.js";

const parseBoolean = (value?: string) => {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

export const listFormsHandler = async (req: Request, res: Response) => {
  const query = formListQuerySchema.parse(req.query);
  const requestedIsActive = parseBoolean(query.isActive);
  const canSeeAll = !!req.user && req.user.role === "admin";

  // По умолчанию:
  // - гость/пользователь: только активные
  // - модератор/админ: все
  // Явный фильтр ?isActive=... разрешаем только тем, кто может видеть все.
  const isActive =
    requestedIsActive !== undefined
      ? (canSeeAll ? requestedIsActive : true)
      : (canSeeAll ? undefined : true);

  const forms = await listForms({ isActive });
  res.json({ status: "ok", data: forms });
};

export const getFormHandler = async (req: Request, res: Response) => {
  const params = formIdParamSchema.parse(req.params);
  const form = await getFormById(params.id);

  const canSeeAll = !!req.user && (req.user.role === "admin" || req.user.role === "moderator");
  if (!form.isActive && !canSeeAll) {
    throw new AppError(404, "Form not found", "not_found");
  }

  res.json({ status: "ok", data: form });
};

export const createFormHandler = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, "Unauthorized", "unauthorized");
  const input = formCreateSchema.parse(req.body);
  const form = await createForm(input, req.user.id);
  res.status(201).json({ status: "ok", data: form });
};

export const updateFormHandler = async (req: Request, res: Response) => {
  const params = formIdParamSchema.parse(req.params);
  const input = formUpdateSchema.parse(req.body);
  const form = await updateForm(params.id, input);
  res.json({ status: "ok", data: form });
};

export const deleteFormHandler = async (req: Request, res: Response) => {
  const params = formIdParamSchema.parse(req.params);
  await deleteForm(params.id);
  res.status(204).send();
};
