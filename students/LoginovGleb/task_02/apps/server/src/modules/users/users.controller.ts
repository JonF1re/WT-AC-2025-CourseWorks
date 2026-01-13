import type { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";

export const meHandler = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Unauthorized", "unauthorized");
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, username: true, role: true, createdAt: true } });
  if (!user) {
    throw new AppError(404, "User not found", "not_found");
  }
  res.json({ status: "ok", data: user });
};
