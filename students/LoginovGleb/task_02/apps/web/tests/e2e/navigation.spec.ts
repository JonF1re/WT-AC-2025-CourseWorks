import { test, expect, TEST_USERS, login } from './fixtures';

test.describe('Навигация', () => {
  test.describe('Навигационное меню', () => {
    test('неавторизованный пользователь видит базовое меню', async ({ page }) => {
      await page.goto('/forms');
      
      // Видны только публичные ссылки
      await expect(page.getByRole('link', { name: 'Формы' })).toBeVisible();
      
      // Кнопки входа/регистрации
      await expect(page.getByRole('link', { name: 'Войти' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Регистрация' })).toBeVisible();
    });

    test('авторизованный пользователь видит расширенное меню', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      // Ссылка на заявки
      await expect(page.getByRole('link', { name: 'Заявки' })).toBeVisible();
      
      // Ссылка на формы
      await expect(page.getByRole('link', { name: 'Формы' })).toBeVisible();
      
      // Кнопка выхода
      await expect(page.getByTestId('logout-btn')).toBeVisible();
    });

    test('логотип ведёт на главную страницу', async ({ page }) => {
      await page.goto('/forms');
      
      // Клик на логотип
      await page.locator('.header__logo').click();
      
      // Редирект на главную
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Переходы между страницами', () => {
    test('переход с формы на заявки после авторизации', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/forms');
      await page.getByRole('link', { name: 'Заявки' }).click();
      
      await expect(page).toHaveURL('/applications');
    });

    test('переход с заявок на формы', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      await page.getByRole('link', { name: 'Формы' }).click();
      
      await expect(page).toHaveURL('/forms');
    });
  });

  test.describe('Страница 404', () => {
    test('несуществующая страница показывает 404', async ({ page }) => {
      await page.goto('/non-existent-page');
      
      await expect(page.getByRole('heading', { name: '404' })).toBeVisible();
    });
  });
});

test.describe('Базовая функциональность UI', () => {
  test('страница полностью загружается', async ({ page }) => {
    await page.goto('/forms');
    
    // Проверяем, что header загрузился
    await expect(page.locator('.header')).toBeVisible();
    
    // Проверяем, что контент загрузился
    await expect(page.getByRole('main').or(page.locator('.page-container').or(page.locator('.page-forms')))).toBeVisible();
  });

  test('заголовок страницы корректный', async ({ page }) => {
    await page.goto('/login');
    
    // Проверяем заголовок вкладки
    await expect(page).toHaveTitle(/Да, я в деле/i);
  });
});
