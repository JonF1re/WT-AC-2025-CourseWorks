import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import app from "../../app";
import { prisma } from "../../lib/prisma";
import jwt from "jsonwebtoken";

describe("MealPlan API (integration)", () => {
  let token: string;
  let userId: string;
  let recipeId: string;

  beforeAll(async () => {
    await prisma.mealPlan.deleteMany();
    await prisma.recipe.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        email: "test@test.com",
        username: "testuser",
        passwordHash: "hashed",
        role: "user"
      }
    });
    userId = user.id;

    token = jwt.sign(
      { sub: userId, role: "user" },
      process.env.JWT_SECRET || "test-secret"
    );

    const recipe = await prisma.recipe.create({
      data: {
        title: "Test recipe",
        instructions: "Cook",
        prepTime: 10,
        servings: 1,
        authorId: userId
      }
    });
    recipeId = recipe.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("POST /mealplan adds recipe", async () => {
    const res = await request(app)
      .post("/mealplan")
      .set("Authorization", `Bearer ${token}`)
      .send({
        recipeId,
        date: "2025-12-25",
        mealType: "lunch"
      });
  
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("ok");
    expect(res.body.data.recipe.title).toBe("Test recipe");
  });
  
  it("GET /mealplan returns meal plan by date", async () => {
    const res = await request(app)
      .get("/mealplan")
      .set("Authorization", `Bearer ${token}`)
      .query({ date: "2025-12-25" });
  
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.data.length).toBe(1);
  });  
});
