import { test as base, expect, Page } from '@playwright/test';

// Test data based on server seed.ts
export const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123!',
    username: 'админ',
    role: 'admin',
  },
  moderator: {
    email: 'moderator@example.com',
    password: 'moderator123!',
    username: 'модератор',
    role: 'moderator',
  },
  user: {
    email: 'user@example.com',
    password: 'user123!',
    username: 'пользователь',
    role: 'user',
  },
} as const;

// Helper function to login
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Пароль').fill(password);
  await page.getByTestId('submit-btn').click();
  
  // Wait for redirect after login (longer timeout for slower systems)
  await page.waitForURL(/\/(applications|forms|admin)/, { timeout: 15000 });
}

// Helper function to logout
export async function logout(page: Page) {
  await page.getByTestId('logout-btn').click();
  await page.waitForURL('/login');
}

// Helper function to register a new user
export async function registerUser(
  page: Page,
  username: string,
  email: string,
  password: string
) {
  await page.goto('/register');
  await page.getByLabel('Имя пользователя').fill(username);
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="confirmPassword"]').fill(password);
  await page.getByTestId('submit-btn').click();
  // Wait for redirect after registration
  await page.waitForURL('/applications');
}

// Generate unique test data
export function generateTestEmail(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `e2e_${Date.now()}_${rand}@test.local`;
}

export function generateTestUsername(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `e2euser${Date.now().toString(36)}${rand}`;
}

// Custom test fixture with authenticated page
type AuthenticatedFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  moderatorPage: Page;
};

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
    await use(page);
  },
  adminPage: async ({ page }, use) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    await use(page);
  },
  moderatorPage: async ({ page }, use) => {
    await login(page, TEST_USERS.moderator.email, TEST_USERS.moderator.password);
    await use(page);
  },
});

export { expect };
