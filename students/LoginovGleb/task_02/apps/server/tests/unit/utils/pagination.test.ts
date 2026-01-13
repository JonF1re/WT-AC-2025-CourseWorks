import { describe, expect, it } from "vitest";
import { buildPagination } from "../../../src/lib/pagination.js";

describe("buildPagination", () => {
  it("returns defaults when values are missing", () => {
    const result = buildPagination();
    expect(result).toEqual({ skip: 0, take: 20, page: 1, pageSize: 20 });
  });

  it("uses provided numeric values", () => {
    const result = buildPagination(3, 25);
    expect(result).toEqual({ skip: 50, take: 25, page: 3, pageSize: 25 });
  });

  it("clamps page and pageSize to safe bounds", () => {
    const result = buildPagination("-2", "500");
    expect(result.page).toBe(1);
    expect(result.take).toBe(100);
    expect(result.skip).toBe(0);
  });
});
