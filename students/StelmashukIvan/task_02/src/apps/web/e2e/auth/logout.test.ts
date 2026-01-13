import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('Logout E2E Tests', () => {
  let page: Page;
  let adminToken: string;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });

    adminToken = 'mock-jwt-token-admin';
    
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 'admin-uuid',
        username: 'admin',
        role: 'admin'
      }));
    }, adminToken);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should logout from dashboard and redirect to login', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('button:has-text("Выйти")')).toBeVisible();
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  test('should logout from admin panel and redirect to login', async () => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('header')).toContainText('Админ-панель');
    
    const logoutButton = page.locator('button:has-text("Выйти")').first();
    await expect(logoutButton).toBeVisible();
    
    await logoutButton.click();
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(token).toBeNull();
    expect(user).toBeNull();
  });

  test('should not access dashboard after logout', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await expect(page.locator('button:has-text("Выйти")')).toBeVisible();
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should not access admin panel after logout', async () => {
    await page.goto(`${BASE_URL}/admin`);
    
    await expect(page.locator('button:has-text("Выйти")').first()).toBeVisible();
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await page.goto(`${BASE_URL}/admin`);
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should clear all user data from localStorage on logout', async () => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('user', JSON.stringify({ id: '1', username: 'test' }));
      localStorage.setItem('userId', '123');
      localStorage.setItem('someOtherData', 'test-data');
    });

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const beforeToken = await page.evaluate(() => localStorage.getItem('token'));
    const beforeUser = await page.evaluate(() => localStorage.getItem('user'));
    const beforeUserId = await page.evaluate(() => localStorage.getItem('userId'));
    
    expect(beforeToken).toBeTruthy();
    expect(beforeUser).toBeTruthy();
    expect(beforeUserId).toBeTruthy();
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    const afterToken = await page.evaluate(() => localStorage.getItem('token'));
    const afterUser = await page.evaluate(() => localStorage.getItem('user'));
    const afterUserId = await page.evaluate(() => localStorage.getItem('userId'));
    const otherData = await page.evaluate(() => localStorage.getItem('someOtherData'));
    
    expect(afterToken).toBeNull();
    expect(afterUser).toBeNull();
    expect(afterUserId).toBeNull();
    expect(otherData).toBe('test-data');
  });

  test('should maintain logout state after page reload', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await page.reload();
    
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('should logout work from any authenticated page', async () => {
    const pages = ['/dashboard', '/admin'];
    
    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      
      const logoutButton = page.locator('button:has-text("Выйти")').first();
      await expect(logoutButton).toBeVisible();
      
      await logoutButton.click();
      
      await page.waitForURL(`${BASE_URL}/login`);
      await expect(page).toHaveURL(`${BASE_URL}/login`);
      
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
      
      await page.evaluate((token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify({
          id: 'admin-uuid',
          username: 'admin',
          role: 'admin'
        }));
      }, adminToken);
    }
  });

  test('should logout button have proper aria-label', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const logoutButton = page.locator('button:has-text("Выйти")');
    await expect(logoutButton).toHaveAttribute('aria-label', 'Выйти из системы');
  });

  test('should logout button contain icon', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const logoutButton = page.locator('button:has-text("Выйти")');
    const icon = logoutButton.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('should handle logout when token is invalid', async () => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'invalid-token');
      localStorage.setItem('user', JSON.stringify({ id: '1', username: 'test', role: 'user' }));
    });

    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeNull();
  });

  test('should redirect to login after logout when trying to access protected route', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await page.goto(`${BASE_URL}/admin/users`);
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should logout work with browser back button after logout', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await page.goBack();
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should logout clear session and redirect immediately', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    const startTime = Date.now();
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    const endTime = Date.now();
    
    const redirectTime = endTime - startTime;
    expect(redirectTime).toBeLessThan(3000);
  });

  test('should logout button be accessible via keyboard', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.keyboard.press('Tab');
    
    const logoutButton = page.locator('button:has-text("Выйти")');
    await expect(logoutButton).toBeFocused();
    
    await page.keyboard.press('Enter');
    
    await page.waitForURL(`${BASE_URL}/login`);
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should maintain login page state after logout', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await expect(page.locator('h1')).toHaveText('Вход в систему');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should allow new login after logout', async () => {
    await page.route(`${API_URL}/auth/login`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            token: 'new-token-after-logout',
            user: {
              id: 'new-user-id',
              username: 'user1',
              role: 'user'
            }
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/dashboard`);
    
    await page.click('button:has-text("Выйти")');
    
    await page.waitForURL(`${BASE_URL}/login`);
    
    await page.fill('input[type="text"]', 'user1');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(token).toContain('new-token-after-logout');
    expect(user).toContain('user1');
  });

  test('should logout work when multiple tabs are open', async () => {
    const context = page.context();
    
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    await page1.goto(`${BASE_URL}/dashboard`);
    await page2.goto(`${BASE_URL}/admin`);
    
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    await page1.click('button:has-text("Выйти")');
    
    await page1.waitForURL(`${BASE_URL}/login`);
    
    await page2.reload();
    
    await page2.waitForURL(`${BASE_URL}/login`);
    
    const token1 = await page1.evaluate(() => localStorage.getItem('token'));
    const token2 = await page2.evaluate(() => localStorage.getItem('token'));
    
    expect(token1).toBeNull();
    expect(token2).toBeNull();
    
    await page1.close();
    await page2.close();
  });
});