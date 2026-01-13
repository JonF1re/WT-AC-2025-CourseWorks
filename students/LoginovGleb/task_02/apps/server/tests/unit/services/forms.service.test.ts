import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/lib/errors.js";

const prismaMock = vi.hoisted(() => ({
  form: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
}));

vi.mock("../../../src/lib/prisma.js", () => ({ prisma: prismaMock }));
vi.mock("../../../src/lib/logger.js", () => ({ logger: loggerMock }));

import { getFormById, updateForm } from "../../../src/modules/forms/forms.service.js";

describe("forms.service", () => {
  beforeEach(() => {
    Object.values(prismaMock.form).forEach((fn) => fn.mockReset());
    Object.values(loggerMock).forEach((fn) => fn.mockReset());
  });

  it("throws when form is not found", async () => {
    prismaMock.form.findUnique.mockResolvedValue(null);

    await expect(getFormById("missing"))
      .rejects.toBeInstanceOf(AppError);
  });

  it("merges existing values on update", async () => {
    const existing = {
      id: "form-1",
      name: "Old name",
      description: "Desc",
      fields: [{ id: "f1" }],
      isActive: true
    };
    prismaMock.form.findUnique.mockResolvedValue(existing);
    prismaMock.form.update.mockResolvedValue({ ...existing, name: "New name" });

    const updated = await updateForm("form-1", { name: "New name" });

    expect(prismaMock.form.update).toHaveBeenCalledWith({
      where: { id: "form-1" },
      data: {
        name: "New name",
        description: existing.description,
        fields: existing.fields,
        isActive: existing.isActive
      }
    });
    expect(updated.name).toBe("New name");
  });
});
