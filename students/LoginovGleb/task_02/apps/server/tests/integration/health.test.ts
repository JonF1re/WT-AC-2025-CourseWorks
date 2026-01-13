import request from "supertest";
import { createTestApp } from "./setup.js";
import "./setup.js";

const app = createTestApp();

describe("health endpoints", () => {
  it("returns ok on /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("returns readiness details", async () => {
    const res = await request(app).get("/ready");
    expect(res.status).toBe(200);
    expect(["ok", "degraded"]).toContain(res.body.status);
    expect(res.body.checks.database.status).toBe("ok");
  });
});
