import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { getCachedData, invalidateByPattern } from "../../lib/cache.js";
import { config } from "../../lib/config.js";

const STATUS_LIST_CACHE_KEY = "statuses:list";

export const listStatuses = async () => {
  return getCachedData(STATUS_LIST_CACHE_KEY, config.cacheTtl.short, () =>
    prisma.status.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] })
  );
};

export const getStatus = async (id: string) => {
  const status = await prisma.status.findUnique({ where: { id } });
  if (!status) throw new AppError(404, "Status not found", "not_found");
  return status;
};

export const createStatus = async (
  input: { name: string; description?: string | null; color?: string | null; order?: number; isFinal?: boolean }
) => {
  const status = await prisma.status.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      color: input.color ? (input.color.startsWith("#") ? input.color : `#${input.color}`) : null,
      order: input.order ?? 0,
      isFinal: input.isFinal ?? false
    }
  });
  logger.info({ statusId: status.id }, "status created");
  await invalidateByPattern(`${STATUS_LIST_CACHE_KEY}*`);
  return status;
};

export const updateStatus = async (
  id: string,
  input: Partial<{ name: string; description: string | null; color: string | null; order: number; isFinal: boolean }>
) => {
  const existing = await prisma.status.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Status not found", "not_found");
  const status = await prisma.status.update({
    where: { id },
    data: {
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      color: input.color !== undefined ? input.color : existing.color,
      order: input.order ?? existing.order,
      isFinal: input.isFinal ?? existing.isFinal
    }
  });
  logger.info({ statusId: status.id }, "status updated");
  await invalidateByPattern(`${STATUS_LIST_CACHE_KEY}*`);
  return status;
};

export const deleteStatus = async (id: string) => {
  const existing = await prisma.status.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Status not found", "not_found");
  await prisma.status.delete({ where: { id } });
  logger.info({ statusId: id }, "status deleted");
  await invalidateByPattern(`${STATUS_LIST_CACHE_KEY}*`);
};
