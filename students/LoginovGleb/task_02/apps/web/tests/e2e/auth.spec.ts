import { test, expect, TEST_USERS, login, logout, generateTestEmail, generateTestUsername } from './fixtures';

test.describe('Аутентификация', () => {
  test.describe('Вход в систему', () => {
    test('должен показывать страницу входа', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByRole('heading', { name: 'Вход в систему' })).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.getByLabel('Пароль')).toBeVisible();
      await expect(page.getByTestId('submit-btn')).toBeVisible();
    });

    test('должен успешно авторизовать пользователя', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel('Email').fill(TEST_USERS.user.email);
      await page.getByLabel('Пароль').fill(TEST_USERS.user.password);
      await page.getByTestId('submit-btn').click();
      
      // Ожидаем редирект на страницу заявок
      await expect(page).toHaveURL(/\/applications/);
      
      // Проверяем, что пользователь залогинен (видно имя пользователя)
      await expect(page.getByText(TEST_USERS.user.username)).toBeVisible();
    });

    test('должен показывать ошибку при неверных данных', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel('Email').fill('wrong@example.com');
      await page.getByLabel('Пароль').fill('wrongpassword');
      await page.getByTestId('submit-btn').click();
      
      // Ожидаем сообщение об ошибке
      await expect(page.getByRole('alert')).toBeVisible();
    });

    test('должен валидировать формат email', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel('Email').fill('invalid-email');
      await page.getByLabel('Пароль').fill('password123');
      await page.getByTestId('submit-btn').click();
      
      // Ожидаем ошибку валидации (alert или HTML5 validation)
      const errorVisible = await page.getByRole('alert').isVisible().catch(() => false);
      const hasValidationError = await page.locator('input:invalid').count() > 0;
      expect(errorVisible || hasValidationError).toBeTruthy();
    });
  });

  test.describe('Регистрация', () => {
    test('должен показывать страницу регистрации', async ({ page }) => {
      await page.goto('/register');
      
      await expect(page.getByRole('heading', { name: 'Регистрация' })).toBeVisible();
      await expect(page.getByLabel('Имя пользователя')).toBeVisible();
      await expect(page.getByLabel('Email')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    });

    test('должен успешно регистрировать нового пользователя', async ({ page }) => {
      const email = generateTestEmail();
      const username = generateTestUsername();
      const password = 'TestPass123!';
      
      await page.goto('/register');
      await page.waitForLoadState('networkidle');
      
      await page.getByLabel('Имя пользователя').fill(username);
      await page.getByLabel('Email').fill(email);
      await page.locator('input[name="password"]').fill(password);
      await page.locator('input[name="confirmPassword"]').fill(password);
      await page.getByTestId('submit-btn').click();
      
      // Ожидаем редирект на страницу заявок (увеличенный таймаут)
      await expect(page).toHaveURL(/\/applications/, { timeout: 15000 });
      
      // Проверяем, что пользователь залогинен
      await expect(page.getByText(username)).toBeVisible();
    });

    test('должен показывать ошибку при несовпадении паролей', async ({ page }) => {
      await page.goto('/register');
      
      await page.getByLabel('Имя пользователя').fill('testuser');
      await page.getByLabel('Email').fill('test@example.com');
      await page.locator('input[name="password"]').fill('password123');
      await page.locator('input[name="confirmPassword"]').fill('differentpassword');
      await page.getByTestId('submit-btn').click();
      
      // Ожидаем ошибку валидации
      await expect(page.getByText('Пароли не совпадают')).toBeVisible();
    });
  });

  test.describe('Выход из системы', () => {
    test('должен успешно выходить из системы', async ({ page }) => {
      // Сначала входим
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      // Проверяем, что мы залогинены
      await expect(page.getByText(TEST_USERS.user.username)).toBeVisible();
      
      // Выходим
      await page.getByTestId('logout-btn').click();
      
      // Ожидаем редирект на страницу входа
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Защита маршрутов', () => {
    test('неавторизованный пользователь перенаправляется на /login при попытке доступа к /applications', async ({ page }) => {
      await page.goto('/applications');
      
      // Ожидаем редирект на страницу входа
      await expect(page).toHaveURL(/\/login/);
    });

    test('неавторизованный пользователь может просматривать публичные формы', async ({ page }) => {
      await page.goto('/forms');
      
      // Страница форм доступна без авторизации
      await expect(page.getByRole('heading', { name: 'Формы заявок' })).toBeVisible();
    });
  });
});
