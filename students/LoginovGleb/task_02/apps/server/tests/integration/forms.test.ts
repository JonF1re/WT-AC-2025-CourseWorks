import request from "supertest";
import { createTestApp, getBaseData, TEST_PASSWORDS } from "./setup.js";
import "./setup.js";

const app = createTestApp();

const loginAndGetToken = async (email: string, password: string) => {
  const res = await request(app).post("/auth/login").send({ email, password });
  return res.body.data.accessToken as string;
};

describe("forms API", () => {
  it("lists active forms for guest", async () => {
    const res = await request(app).get("/forms");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("allows admin to create a form", async () => {
    const { admin } = getBaseData();
    const token = await loginAndGetToken(admin.email, TEST_PASSWORDS.admin);

    const res = await request(app)
      .post("/forms")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Form",
        description: "created by admin",
        fields: [{ name: "q1", label: "Question", type: "text" }],
        isActive: true
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("New Form");
  });

  it("forbids regular user from creating a form", async () => {
    const { user } = getBaseData();
    const token = await loginAndGetToken(user.email, TEST_PASSWORDS.user);

    const res = await request(app)
      .post("/forms")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Should Fail", fields: [] });

    expect(res.status).toBe(403);
  });

  it("allows admin to update a form", async () => {
    const { admin, form } = getBaseData();
    const token = await loginAndGetToken(admin.email, TEST_PASSWORDS.admin);

    const res = await request(app)
      .put(`/forms/${form.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ description: "updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("updated");
  });
});
