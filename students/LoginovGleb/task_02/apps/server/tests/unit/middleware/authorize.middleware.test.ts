import { describe, expect, it, vi } from "vitest";
import { authorizeRoles } from "../../../src/middleware/authorize.js";
import { AppError } from "../../../src/lib/errors.js";

describe("authorizeRoles middleware", () => {
  const createNext = () => vi.fn();

  it("rejects when user is missing", () => {
    const handler = authorizeRoles("admin");
    const req: any = { user: undefined };
    const next = createNext();

    handler(req, {} as any, next);

    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it("rejects when role is not allowed", () => {
    const handler = authorizeRoles("admin");
    const req: any = { user: { id: "u1", role: "user" } };
    const next = createNext();

    handler(req, {} as any, next);

    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(403);
  });

  it("passes through when role is allowed", () => {
    const handler = authorizeRoles("admin", "moderator");
    const req: any = { user: { id: "u2", role: "admin" } };
    const next = createNext();

    handler(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
  });
});
