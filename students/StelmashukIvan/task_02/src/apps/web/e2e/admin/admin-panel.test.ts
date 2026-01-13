import { test, expect, Page } from '@playwright/test';

// Вспомогательная функция для логина как администратор
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

// Вспомогательная функция для логина как обычный пользователь
async function loginAsUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
}

test.describe('Admin Panel', () => {
  test.describe('Admin Dashboard', () => {
    test('should redirect non-admin users to dashboard', async ({ page }) => {
      await loginAsUser(page);
      await page.goto('/admin');
      await page.waitForURL('/dashboard');
      await expect(page).toHaveURL('/dashboard');
    });

    test('should load admin dashboard for admin user', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      await expect(page.locator('h1')).toContainText('Административная панель');
      await expect(page.locator('span:has-text("Администратор")')).toBeVisible();
    });

    test('should display admin user information', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      const userInfo = page.locator('p:has-text("Вы вошли как:")');
      await expect(userInfo).toBeVisible();
      await expect(userInfo).toContainText('admin');
      await expect(userInfo).toContainText('Администратор');
    });

    test('should have navigation links', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      const navItems = ['Пользователи', 'Устройства', 'Метрики', 'Правила оповещений'];
      
      for (const item of navItems) {
        const navLink = page.locator(`a:has-text("${item}")`);
        await expect(navLink).toBeVisible();
      }
    });

    test('should highlight active navigation item', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users');
      
      const activeLink = page.locator('a[aria-current="page"]');
      await expect(activeLink).toBeVisible();
      await expect(activeLink).toContainText('Пользователи');
    });

    test('should navigate between admin sections', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      const sections = [
        { text: 'Устройства', url: '/admin/devices' },
        { text: 'Метрики', url: '/admin/metrics' },
        { text: 'Правила оповещений', url: '/admin/alert-rules' },
        { text: 'Пользователи', url: '/admin/users' },
      ];
      
      for (const section of sections) {
        await page.click(`a:has-text("${section.text}")`);
        await page.waitForURL(section.url);
        await expect(page).toHaveURL(section.url);
        
        const activeLink = page.locator(`a:has-text("${section.text}")[aria-current="page"]`);
        await expect(activeLink).toBeVisible();
      }
    });

    test('should have logout functionality', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      const logoutButton = page.locator('button:has-text("Выйти")');
      await expect(logoutButton).toBeVisible();
      
      await logoutButton.click();
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
      
      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();
    });

    test('should show session status', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      const sessionStatus = page.locator('footer span:has-text("Сессия активна")');
      await expect(sessionStatus).toBeVisible();
      
      const statusIndicator = page.locator('footer span[aria-hidden="true"]');
      await expect(statusIndicator).toBeVisible();
      await expect(statusIndicator).toHaveCSS('background-color', /var\(--success\)|#[0-9a-fA-F]{6}/);
    });
  });

  test.describe('Users Management Page', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users');
    });

    test('should load users management page', async ({ page }) => {
      await expect(page.locator('h1')).toContainText('Управление пользователями');
      await expect(page.locator('p')).toContainText('Добавляйте и управляйте пользователями системы');
    });

    test('should display add user form', async ({ page }) => {
      const form = page.locator('form[aria-label="Форма добавления пользователя"]');
      await expect(form).toBeVisible();
      
      await expect(page.locator('label[for="username"]')).toContainText('Имя пользователя');
      await expect(page.locator('label[for="password"]')).toContainText('Пароль');
      
      const usernameInput = page.locator('#username');
      const passwordInput = page.locator('#password');
      
      await expect(usernameInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      await expect(page.locator('#username-hint')).toContainText('Уникальное имя для входа в систему');
      await expect(page.locator('#password-hint')).toContainText('Не менее 6 символов');
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.click('button[type="submit"]');
      
      const errorAlert = page.locator('.alert.critical');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText('Введите логин и пароль');
    });

    test('should validate password length', async ({ page }) => {
      await page.fill('#username', 'testuser2');
      await page.fill('#password', '123');
      await page.click('button[type="submit"]');
      
      const errorAlert = page.locator('.alert.critical');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText('Пароль должен быть не менее 6 символов');
    });

    test('should create new user successfully', async ({ page }) => {
      const timestamp = Date.now();
      const testUsername = `testuser_${timestamp}`;
      
      await page.fill('#username', testUsername);
      await page.fill('#password', 'password123');
      
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).not.toHaveAttribute('aria-busy', 'true');
      
      await submitButton.click();
      
      await expect(submitButton).toHaveAttribute('aria-busy', 'true');
      
      await page.waitForTimeout(1000);
      
      const newUserRow = page.locator(`table tr:has-text("${testUsername}")`);
      await expect(newUserRow).toBeVisible();
      
      await expect(page.locator('#username')).toHaveValue('');
      await expect(page.locator('#password')).toHaveValue('');
    });

    test('should display users list', async ({ page }) => {
      const table = page.locator('table[aria-label="Список пользователей"]');
      await expect(table).toBeVisible();
      
      const headers = table.locator('thead th');
      await expect(headers).toHaveCount(3);
      await expect(headers.nth(0)).toContainText('Имя пользователя');
      await expect(headers.nth(1)).toContainText('Роль');
      await expect(headers.nth(2)).toContainText('Действия');
    });

    test('should highlight current user in the list', async ({ page }) => {
      const currentUserRow = page.locator('table tr:has-text("(Вы)")');
      await expect(currentUserRow).toBeVisible();
      await expect(currentUserRow).toHaveCSS('background-color', /rgba\(59, 130, 246, 0.1\)/);
    });

    test('should show role badges', async ({ page }) => {
      const adminBadges = page.locator('span:has-text("Администратор")');
      const userBadges = page.locator('span:has-text("Пользователь")');
      
      await expect(adminBadges.first()).toBeVisible();
      await expect(userBadges.first()).toBeVisible();
      
      await expect(adminBadges.first()).toHaveCSS('background-color', /rgba\(59, 130, 246, 0.2\)/);
      await expect(userBadges.first()).toHaveCSS('background-color', /rgba\(156, 163, 175, 0.2\)/);
    });

    test('should prevent self-deletion', async ({ page }) => {
      const currentUserRow = page.locator('table tr:has-text("(Вы)")');
      const deleteButton = currentUserRow.locator('button:has-text("Удалить")');
      
      await expect(deleteButton).not.toBeVisible();
      await expect(currentUserRow.locator('span:has-text("—")')).toBeVisible();
    });

    test('should delete other users with confirmation', async ({ page }) => {
      page.on('dialog', dialog => dialog.accept());
      
      const userRows = page.locator('table tbody tr');
      const initialCount = await userRows.count();
      
      const deletableUserRow = page.locator('table tbody tr:not(:has-text("(Вы)"))').first();
      await expect(deletableUserRow).toBeVisible();
      
      const deleteButton = deletableUserRow.locator('button:has-text("Удалить")');
      await expect(deleteButton).toBeVisible();
      
      await deleteButton.click();
      
      await page.waitForTimeout(500);
      
      const finalCount = await page.locator('table tbody tr').count();
      expect(finalCount).toBeLessThan(initialCount);
    });

    test('should refresh users list', async ({ page }) => {
      const refreshButton = page.locator('button:has-text("Обновить")');
      await expect(refreshButton).toBeVisible();
      
      await refreshButton.click();
      
      await expect(refreshButton).toContainText('Загрузка...');
      await page.waitForTimeout(1000);
      await expect(refreshButton).toContainText('Обновить');
    });

    test('should show loading state', async ({ page }) => {
      const refreshButton = page.locator('button:has-text("Обновить")');
      await refreshButton.click();
      
      const loadingText = page.locator('div:has-text("Загрузка пользователей...")');
      await expect(loadingText).toBeVisible();
    });

    test('should handle empty users list', async ({ page }) => {
      await page.route('http://localhost:3000/users', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok', data: [] })
        });
      });
      
      await page.reload();
      
      const emptyState = page.locator('div:has-text("Пользователи не найдены")');
      await expect(emptyState).toBeVisible();
    });
  });

  test.describe('Access Control Tests', () => {
    test('should restrict admin routes to admin users only', async ({ page }) => {
      await loginAsUser(page);
      
      const adminRoutes = [
        '/admin',
        '/admin/users',
        '/admin/devices',
        '/admin/metrics',
        '/admin/alert-rules'
      ];
      
      for (const route of adminRoutes) {
        await page.goto(route);
        await page.waitForURL('/dashboard');
        await expect(page).toHaveURL('/dashboard');
      }
    });

    test('should maintain admin session', async ({ page, context }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/users');
      
      await expect(page).toHaveURL('/admin/users');
      
      await page.reload();
      
      await expect(page).toHaveURL('/admin/users');
      await expect(page.locator('h1')).toContainText('Управление пользователями');
    });

    test('should logout and clear session', async ({ page, context }) => {
      await loginAsAdmin(page);
      await page.goto('/admin');
      
      const logoutButton = page.locator('button:has-text("Выйти")');
      await logoutButton.click();
      
      await page.waitForURL('/login');
      
      await page.goto('/admin');
      await page.waitForURL('/login');
      await expect(page).toHaveURL('/login');
    });
  });
});