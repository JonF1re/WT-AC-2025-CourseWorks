import { describe, expect, it } from "vitest";
import { AppError, isAppError } from "../../../src/lib/errors.js";

describe("errors helpers", () => {
  it("detects AppError instances", () => {
    const err = new AppError(400, "bad");
    expect(isAppError(err)).toBe(true);
  });

  it("ignores non-AppError values", () => {
    expect(isAppError(new Error("oops"))).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});
