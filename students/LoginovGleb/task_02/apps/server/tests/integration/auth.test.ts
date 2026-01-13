import request from "supertest";
import { createTestApp, getBaseData, TEST_PASSWORDS } from "./setup.js";
import "./setup.js";

const app = createTestApp();

const extractRefreshCookie = (res: request.Response) => {
  const cookies = res.get("set-cookie") || [];
  return cookies.find((c) => c.startsWith("refresh_token="));
};

describe("auth flow", () => {
  it("registers a new user and returns tokens", async () => {
    const uniqueEmail = `new-${Date.now()}@test.local`;
    const res = await request(app)
      .post("/auth/register")
      .send({ email: uniqueEmail, username: "new-user", password: "Secret123!" });

    expect(res.status).toBe(201);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(extractRefreshCookie(res)).toBeTruthy();
  });

  it("logs in with valid credentials", async () => {
    const { user } = getBaseData();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORDS.user });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(extractRefreshCookie(res)).toBeTruthy();
  });

  it("rejects invalid password", async () => {
    const { user } = getBaseData();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "wrong" });

    expect(res.status).toBe(400);
  });

  it("rotates refresh token", async () => {
    const { user } = getBaseData();
    const agent = request.agent(app);

    const loginRes = await agent
      .post("/auth/login")
      .send({ email: user.email, password: TEST_PASSWORDS.user });

    const refreshRes = await agent.post("/auth/refresh");

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    expect(extractRefreshCookie(refreshRes)).toBeTruthy();
  });

  it("clears refresh cookie on logout", async () => {
    const { user } = getBaseData();
    const agent = request.agent(app);

    await agent.post("/auth/login").send({ email: user.email, password: TEST_PASSWORDS.user });
    const logoutRes = await agent.post("/auth/logout");

    expect(logoutRes.status).toBe(200);
    const cleared = (logoutRes.get("set-cookie") || []).find((c) => c.startsWith("refresh_token="));
    expect(cleared).toBeTruthy();
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});
