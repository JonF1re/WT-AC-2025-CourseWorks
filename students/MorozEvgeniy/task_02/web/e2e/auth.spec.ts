import { test, expect } from "@playwright/test";

test("user can open app and see login page", async ({ page }) => {
  await page.goto("http://localhost:5173/login");

  await expect(
    page.getByRole("heading", { name: "Login" })
  ).toBeVisible();

  await expect(page.getByPlaceholder("email")).toBeVisible();
  await expect(page.getByPlaceholder("password")).toBeVisible();
});
