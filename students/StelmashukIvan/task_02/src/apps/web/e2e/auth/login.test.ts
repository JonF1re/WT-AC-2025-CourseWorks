import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('Login Page E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display login page correctly', async () => {
    await expect(page).toHaveURL(`${BASE_URL}/login`);
    await expect(page.locator('h1')).toHaveText('Вход в систему');
    await expect(page.locator('label[for="login-username"]')).toHaveText('Логин *');
    await expect(page.locator('label[for="login-password"]')).toHaveText('Пароль *');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show validation error for empty username', async () => {
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Введите логин');
  });

  test('should show validation error for empty password', async () => {
    await page.fill('input[type="text"]', 'testuser');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Введите пароль');
  });

  test('should show validation error for short password', async () => {
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Пароль должен быть не короче 6 символов');
  });

  test('should show error for invalid credentials', async () => {
    await page.fill('input[type="text"]', 'wronguser');
    await page.fill('input[type="password"]', 'wrongpass123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Ошибка входа');
  });

  test('should successfully login as admin and redirect to admin panel', async () => {
    const adminData = {
      username: 'admin',
      password: 'hashed_admin'
    };

    await page.route(`${API_URL}/auth/login`, async route => {
      const request = route.request();
      const postData = JSON.parse(await request.postData() || '{}');
      
      if (postData.username === adminData.username && postData.password === adminData.password) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              token: 'mock-jwt-token-admin',
              user: {
                id: 'admin-uuid',
                username: 'admin',
                role: 'admin'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.fill('input[type="text"]', adminData.username);
    await page.fill('input[type="password"]', adminData.password);
    
    await Promise.all([
      page.waitForResponse(`${API_URL}/auth/login`),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(`${BASE_URL}/admin`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(token).toBeTruthy();
    expect(user).toBeTruthy();
    
    if (user) {
      const parsedUser = JSON.parse(user);
      expect(parsedUser.role).toBe('admin');
    }
  });

  test('should successfully login as regular user and redirect to dashboard', async () => {
    const userData = {
      username: 'user1',
      password: 'hashed_user1'
    };

    await page.route(`${API_URL}/auth/login`, async route => {
      const request = route.request();
      const postData = JSON.parse(await request.postData() || '{}');
      
      if (postData.username === userData.username && postData.password === userData.password) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              token: 'mock-jwt-token-user',
              user: {
                id: 'user-uuid',
                username: 'user1',
                role: 'user'
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.fill('input[type="text"]', userData.username);
    await page.fill('input[type="password"]', userData.password);
    
    await Promise.all([
      page.waitForResponse(`${API_URL}/auth/login`),
      page.click('button[type="submit"]')
    ]);

    await page.waitForURL(`${BASE_URL}/dashboard`);
    
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const user = await page.evaluate(() => localStorage.getItem('user'));
    
    expect(token).toBeTruthy();
    expect(user).toBeTruthy();
    
    if (user) {
      const parsedUser = JSON.parse(user);
      expect(parsedUser.role).toBe('user');
    }
  });

  test('should show loading state during login request', async () => {
    await page.route(`${API_URL}/auth/login`, async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            token: 'mock-token',
            user: { id: '1', username: 'test', role: 'user' }
          }
        })
      });
    });

    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass123');
    
    const clickPromise = page.click('button[type="submit"]');
    
    await expect(page.locator('button[type="submit"] >> div')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveAttribute('aria-busy', 'true');
    
    await clickPromise;
  });

  test('should close error message when close button is clicked', async () => {
    await page.fill('input[type="text"]', '');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    
    await page.click('.alert.critical button[aria-label="Закрыть сообщение об ошибке"]');
    
    await expect(page.locator('.alert.critical')).not.toBeVisible();
  });

  test('should not allow login with empty spaces as username', async () => {
    await page.fill('input[type="text"]', '   ');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Введите логин');
  });

  test('should have autoComplete attributes for accessibility', async () => {
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');
    
    await expect(usernameInput).toHaveAttribute('autoComplete', 'username');
    await expect(passwordInput).toHaveAttribute('autoComplete', 'current-password');
  });

  test('should focus username field when error occurs', async () => {
    await page.click('button[type="submit"]');
    
    await expect(page.locator('input[type="text"]')).toBeFocused();
  });

  test('should clear password field on failed login', async () => {
    await page.fill('input[type="text"]', 'wronguser');
    await page.fill('input[type="password"]', 'somepassword');
    
    await page.route(`${API_URL}/auth/login`, async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'invalid_credentials', message: 'Invalid credentials' }
        })
      });
    });
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('input[type="password"]')).toHaveValue('');
  });

  test('should redirect authenticated users away from login page', async () => {
    await page.evaluate(() => {
      localStorage.setItem('token', 'existing-token');
      localStorage.setItem('user', JSON.stringify({ id: '1', username: 'test', role: 'user' }));
    });

    await page.goto(`${BASE_URL}/login`);
    
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should handle network errors gracefully', async () => {
    await page.route(`${API_URL}/auth/login`, async route => {
      await route.abort('failed');
    });

    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpass123');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
  });

  test('should navigate to correct admin routes after login', async () => {
    await page.route(`${API_URL}/auth/login`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            token: 'mock-token',
            user: { id: '1', username: 'admin', role: 'admin' }
          }
        })
      });
    });

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${BASE_URL}/admin`);
  });

  test('should navigate to dashboard for non-admin users', async () => {
    await page.route(`${API_URL}/auth/login`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            token: 'mock-token',
            user: { id: '1', username: 'user', role: 'user' }
          }
        })
      });
    });

    await page.fill('input[type="text"]', 'user');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(`${BASE_URL}/dashboard`);
  });

  test('should have proper ARIA labels and roles', async () => {
    await expect(page.locator('form')).toHaveAttribute('aria-label', 'Форма входа');
    await expect(page.locator('.alert.critical')).toHaveAttribute('role', 'alert');
    await expect(page.locator('.alert.critical')).toHaveAttribute('aria-live', 'polite');
  });
});