import { describe, expect, it, vi } from "vitest";
import { AppError } from "../../../src/lib/errors.js";

const verifyAccessTokenMock = vi.hoisted(() => vi.fn());

vi.mock("../../../src/lib/jwt.js", () => ({
  verifyAccessToken: verifyAccessTokenMock,
}));

import { authenticate, authenticateOptional } from "../../../src/middleware/auth.js";

describe("authenticate middleware", () => {
  const createNext = () => vi.fn();

  it("fails when authorization header is missing", () => {
    const req: any = { headers: {} };
    const next = createNext();

    authenticate(req, {} as any, next);

    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });

  it("populates req.user on valid token", () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const next = createNext();
    verifyAccessTokenMock.mockReturnValue({ sub: "user-1", role: "admin" });

    authenticate(req, {} as any, next);

    expect(verifyAccessTokenMock).toHaveBeenCalledWith("token");
    expect(req.user).toEqual({ id: "user-1", role: "admin" });
    expect(next).toHaveBeenCalledWith();
  });

  it("bubbles unauthorized error on invalid token", () => {
    const req: any = { headers: { authorization: "Bearer bad" } };
    const next = createNext();
    verifyAccessTokenMock.mockImplementation(() => {
      throw new Error("bad token");
    });

    authenticate(req, {} as any, next);

    const err = next.mock.calls[0][0] as AppError;
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(401);
  });
});

describe("authenticateOptional middleware", () => {
  const createNext = () => vi.fn();

  it("skips when header is absent", () => {
    const req: any = { headers: {} };
    const next = createNext();

    authenticateOptional(req, {} as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
  });

  it("accepts valid token when provided", () => {
    const req: any = { headers: { authorization: "Bearer token" } };
    const next = createNext();
    verifyAccessTokenMock.mockReturnValue({ sub: "user-2", role: "user" });

    authenticateOptional(req, {} as any, next);

    expect(req.user).toEqual({ id: "user-2", role: "user" });
    expect(next).toHaveBeenCalledWith();
  });
});
