import request from "supertest";
import { createTestApp, getBaseData, TEST_PASSWORDS } from "./setup.js";
import "./setup.js";

const app = createTestApp();

const loginAndGetToken = async (email: string, password: string) => {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.data.accessToken as string;
};

describe("applications API", () => {
  it("allows user to create a draft application", async () => {
    const { user, form, statuses } = getBaseData();
    const token = await loginAndGetToken(user.email, TEST_PASSWORDS.user);

    const res = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ formId: form.id, data: { field: "value" } });

    expect(res.status).toBe(201);
    expect(res.body.data.statusId).toBe(statuses.draft.id);
  });

  it("forbids another user from viewing someone else's application", async () => {
    const { user, form } = getBaseData();
    const tokenUser1 = await loginAndGetToken(user.email, TEST_PASSWORDS.user);

    const createRes = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${tokenUser1}`)
      .send({ formId: form.id, data: { field: "value" } });

    const tokenUser2 = await loginAndGetToken("user2@test.local", TEST_PASSWORDS.userTwo);

    const res = await request(app)
      .get(`/applications/${createRes.body.data.id}`)
      .set("Authorization", `Bearer ${tokenUser2}`);

    expect(res.status).toBe(403);
  });

  it("submits draft to pending", async () => {
    const { user, form, statuses } = getBaseData();
    const token = await loginAndGetToken(user.email, TEST_PASSWORDS.user);

    const createRes = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${token}`)
      .send({ formId: form.id, data: { field: "value" } });

    const submitRes = await request(app)
      .post(`/applications/${createRes.body.data.id}/submit`)
      .set("Authorization", `Bearer ${token}`);

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.statusId).toBe(statuses.pending.id);
  });

  it("admin can list all applications", async () => {
    const { user, admin, form } = getBaseData();
    const userToken = await loginAndGetToken(user.email, TEST_PASSWORDS.user);
    const adminToken = await loginAndGetToken(admin.email, TEST_PASSWORDS.admin);

    await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ formId: form.id, data: { field: "value" } });

    const res = await request(app)
      .get("/applications")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
  });

  it("admin can change status", async () => {
    const { user, admin, form, statuses } = getBaseData();
    const userToken = await loginAndGetToken(user.email, TEST_PASSWORDS.user);
    const adminToken = await loginAndGetToken(admin.email, TEST_PASSWORDS.admin);

    const createRes = await request(app)
      .post("/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ formId: form.id, data: { field: "value" } });

    const res = await request(app)
      .put(`/applications/${createRes.body.data.id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ statusId: statuses.approved.id });

    expect(res.status).toBe(200);
    expect(res.body.data.statusId).toBe(statuses.approved.id);
  });
});
