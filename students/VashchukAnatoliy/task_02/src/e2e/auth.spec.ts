import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'password123',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should register a new user', async ({ page }) => {
    // Navigate to registration page
    await page.click('text=Регистрация');
    
    // Fill registration form
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to feed after successful registration
    await expect(page).toHaveURL(/\/feed/);
  });

  test('should login with existing user', async ({ page }) => {
    // First register
    await page.goto('/register');
    await page.fill('input[name="username"]', `logintest_${timestamp}`);
    await page.fill('input[name="email"]', `logintest_${timestamp}@example.com`);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Выйти');
    
    // Login again
    await page.goto('/login');
    await page.fill('input[name="username"]', `logintest_${timestamp}`);
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should be logged in
    await expect(page).toHaveURL(/\/feed/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[name="username"]', 'nonexistent');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/Неверные данные/i')).toBeVisible();
  });

  test('should validate registration form', async ({ page }) => {
    await page.goto('/register');
    
    // Try to submit with empty fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/обязательно/i').first()).toBeVisible();
  });
});
