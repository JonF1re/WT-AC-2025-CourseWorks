import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { buildPagination } from "../../lib/pagination.js";

const DEFAULT_DRAFT_STATUS = "draft";
const DEFAULT_PENDING_STATUS = "pending";
const DEFAULT_WITHDRAWN_STATUS = "withdrawn";

const ensureStatusByName = async (name: string) => {
  const status = await prisma.status.findFirst({ where: { name } });
  if (!status) throw new AppError(400, `Status '${name}' is not configured`, "invalid_status");
  return status;
};

const assertCanViewApplication = async (user: { id: string; role: string }, appUserId: string) => {
  if (user.role === "admin" || user.role === "moderator") return;
  if (user.id !== appUserId) throw new AppError(403, "Forbidden", "forbidden");
};

const assertIsOwnerOrAdmin = (user: { id: string; role: string }, appUserId: string) => {
  if (user.role === "admin") return;
  if (user.id !== appUserId) throw new AppError(403, "Forbidden", "forbidden");
};

export const listApplications = async (
  currentUser: { id: string; role: string },
  filters: { statusId?: string; formId?: string; userId?: string; page?: string; pageSize?: string }
) => {
  const { skip, take, page, pageSize } = buildPagination(filters.page, filters.pageSize);
  const where: any = {};
  if (filters.statusId) where.statusId = filters.statusId;
  if (filters.formId) where.formId = filters.formId;
  if (currentUser.role === "admin" || currentUser.role === "moderator") {
    if (filters.userId) where.userId = filters.userId;
  } else {
    where.userId = currentUser.id;
  }

  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: {
        form: true,
        status: true
      }
    }),
    prisma.application.count({ where })
  ]);

  return { items, page, pageSize, total };
};

export const getApplication = async (id: string, currentUser: { id: string; role: string }) => {
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      attachments: true,
      form: true,
      status: true,
      user: true,
      history: {
        orderBy: { changedAt: "desc" },
        include: { toStatus: true, fromStatus: true, changedBy: true }
      }
    }
  });
  if (!app) throw new AppError(404, "Application not found", "not_found");
  await assertCanViewApplication(currentUser, app.userId);
  return app;
};

export const createApplication = async (
  input: { formId: string; data: Record<string, unknown>; comment?: string | null },
  currentUser: { id: string; role: string }
) => {
  const form = await prisma.form.findUnique({ where: { id: input.formId } });
  if (!form || !form.isActive) throw new AppError(400, "Form is not available", "invalid_form");

  const draftStatus = await ensureStatusByName(DEFAULT_DRAFT_STATUS);

  const app = await prisma.application.create({
    data: {
      formId: input.formId,
      userId: currentUser.id,
      statusId: draftStatus.id,
      data: input.data as object,
      comment: input.comment ?? null
    }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: app.id,
      fromStatusId: null,
      toStatusId: draftStatus.id,
      changedById: currentUser.id,
      comment: "created"
    }
  });

  logger.info({ applicationId: app.id, userId: currentUser.id }, "application created");
  return app;
};

export const updateApplication = async (
  id: string,
  input: { data?: Record<string, unknown>; comment?: string | null },
  currentUser: { id: string; role: string }
) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new AppError(404, "Application not found", "not_found");
  assertIsOwnerOrAdmin(currentUser, app.userId);
  if (app.statusId !== (await ensureStatusByName(DEFAULT_DRAFT_STATUS)).id && currentUser.role !== "admin") {
    throw new AppError(403, "Only draft applications can be edited", "forbidden");
  }

  const updated = await prisma.application.update({
    where: { id },
    data: {
      data: (input.data ?? app.data) as object,
      comment: input.comment ?? app.comment
    }
  });
  logger.info({ applicationId: id, userId: currentUser.id }, "application updated");
  return updated;
};

export const deleteApplication = async (id: string, currentUser: { id: string; role: string }) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new AppError(404, "Application not found", "not_found");
  if (currentUser.role !== "admin") {
    assertIsOwnerOrAdmin(currentUser, app.userId);
    const draftStatus = await ensureStatusByName(DEFAULT_DRAFT_STATUS);
    if (app.statusId !== draftStatus.id) {
      throw new AppError(403, "Only draft applications can be deleted", "forbidden");
    }
  }
  await prisma.application.delete({ where: { id } });
  logger.info({ applicationId: id, userId: currentUser.id }, "application deleted");
};

export const submitApplication = async (id: string, currentUser: { id: string; role: string }) => {
  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new AppError(404, "Application not found", "not_found");
  assertIsOwnerOrAdmin(currentUser, app.userId);
  const draftStatus = await ensureStatusByName(DEFAULT_DRAFT_STATUS);
  const pendingStatus = await ensureStatusByName(DEFAULT_PENDING_STATUS);
  if (app.statusId !== draftStatus.id && currentUser.role !== "admin") {
    throw new AppError(403, "Only draft applications can be submitted", "forbidden");
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { statusId: pendingStatus.id, submittedAt: new Date() }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: id,
      fromStatusId: app.statusId,
      toStatusId: pendingStatus.id,
      changedById: currentUser.id,
      comment: "submitted"
    }
  });
  logger.info({ applicationId: id, userId: currentUser.id }, "application submitted");
  return updated;
};

export const changeApplicationStatus = async (
  id: string,
  input: { statusId: string; comment?: string | null },
  currentUser: { id: string; role: string }
) => {
  if (currentUser.role !== "admin" && currentUser.role !== "moderator") {
    throw new AppError(403, "Forbidden", "forbidden");
  }

  const app = await prisma.application.findUnique({ where: { id } });
  if (!app) throw new AppError(404, "Application not found", "not_found");

  const status = await prisma.status.findUnique({ where: { id: input.statusId } });
  if (!status) throw new AppError(400, "Status not found", "invalid_status");

  const updated = await prisma.application.update({
    where: { id },
    data: { statusId: status.id, comment: input.comment ?? app.comment }
  });

  await prisma.statusHistory.create({
    data: {
      applicationId: id,
      fromStatusId: app.statusId,
      toStatusId: status.id,
      changedById: currentUser.id,
      comment: input.comment ?? undefined
    }
  });
  logger.info({ applicationId: id, userId: currentUser.id, statusId: status.id }, "application status changed");
  return updated;
};

export const withdrawApplication = async (id: string, currentUser: { id: string; role: string }) => {
  const app = await prisma.application.findUnique({ where: { id }, include: { status: true } });
  if (!app) throw new AppError(404, "Application not found", "not_found");
  assertIsOwnerOrAdmin(currentUser, app.userId);

  if (app.status?.isFinal) {
    throw new AppError(403, "Cannot withdraw finalized application", "forbidden");
  }

  const withdrawnStatus = await ensureStatusByName(DEFAULT_WITHDRAWN_STATUS);

  const updated = await prisma.application.update({ where: { id }, data: { statusId: withdrawnStatus.id } });
  await prisma.statusHistory.create({
    data: {
      applicationId: id,
      fromStatusId: app.statusId,
      toStatusId: withdrawnStatus.id,
      changedById: currentUser.id,
      comment: "withdrawn"
    }
  });
  logger.info({ applicationId: id, userId: currentUser.id }, "application withdrawn");
  return updated;
};
