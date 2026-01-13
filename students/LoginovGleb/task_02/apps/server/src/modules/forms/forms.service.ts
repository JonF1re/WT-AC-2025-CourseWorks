import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { getCachedData, invalidateByPattern } from "../../lib/cache.js";
import { config } from "../../lib/config.js";

const buildFormsCacheKey = (isActive?: boolean | null) => {
  const suffix = isActive === undefined || isActive === null ? "all" : isActive ? "active" : "inactive";
  return `forms:list:${suffix}`;
};

export const listForms = async (opts: { isActive?: boolean | null }) => {
  const cacheKey = buildFormsCacheKey(opts.isActive);
  return getCachedData(cacheKey, config.cacheTtl.short, () =>
    prisma.form.findMany({
      where: {
        isActive: opts.isActive === undefined || opts.isActive === null ? undefined : opts.isActive
      },
      orderBy: { createdAt: "desc" }
    })
  );
};

export const getFormById = async (id: string) => {
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) throw new AppError(404, "Form not found", "not_found");
  return form;
};

export const createForm = async (
  input: { name: string; description?: string | null; fields: unknown[]; isActive?: boolean },
  createdById: string
) => {
  const form = await prisma.form.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      fields: input.fields as any,
      isActive: input.isActive ?? true,
      createdById
    }
  });
  logger.info({ formId: form.id, userId: createdById }, "form created");
  await invalidateByPattern("forms:list:*");
  return form;
};

export const updateForm = async (
  id: string,
  input: Partial<{ name: string; description: string | null; fields: unknown[]; isActive: boolean }>
) => {
  const existing = await prisma.form.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Form not found", "not_found");
  const form = await prisma.form.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      fields: (input.fields as any) ?? existing.fields,
      isActive: input.isActive ?? existing.isActive
    }
  });
  logger.info({ formId: form.id }, "form updated");
  await invalidateByPattern("forms:list:*");
  return form;
};

export const deleteForm = async (id: string) => {
  const existing = await prisma.form.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Form not found", "not_found");
  await prisma.form.delete({ where: { id } });
  logger.info({ formId: id }, "form deleted");
  await invalidateByPattern("forms:list:*");
};
