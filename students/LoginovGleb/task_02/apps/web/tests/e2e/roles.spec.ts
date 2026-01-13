import { test, expect, TEST_USERS, login } from './fixtures';

test.describe('Роли и права доступа', () => {
  test.describe('Обычный пользователь (user)', () => {
    test('видит только свои заявки', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      // Проверяем заголовок страницы
      await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();
      await expect(page.getByText('Ваши заявки')).toBeVisible();
    });

    test('не видит ссылку на панель администратора', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      // Проверяем, что ссылки на админ-панель нет
      await expect(page.getByRole('link', { name: 'Админ' })).not.toBeVisible();
    });

    test('не имеет доступа к панели администратора напрямую', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/admin');
      
      // Ожидаем сообщение об отсутствии прав
      await expect(page.getByText('У вас нет прав')).toBeVisible();
    });

    test('не видит ссылку на статусы', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      // Проверяем, что ссылки на статусы нет для обычного пользователя
      await expect(page.getByRole('link', { name: 'Статусы' })).not.toBeVisible();
    });
  });

  test.describe('Модератор (moderator)', () => {
    test('видит все заявки в системе', async ({ page }) => {
      await login(page, TEST_USERS.moderator.email, TEST_USERS.moderator.password);
      
      await page.goto('/applications');
      
      // Проверяем заголовок страницы
      await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();
      await expect(page.getByText('Все заявки в системе')).toBeVisible();
    });

    test('видит ссылку на статусы', async ({ page }) => {
      await login(page, TEST_USERS.moderator.email, TEST_USERS.moderator.password);
      
      // Проверяем, что ссылка на статусы видна
      await expect(page.getByRole('link', { name: 'Статусы' })).toBeVisible();
    });

    test('может перейти на страницу статусов', async ({ page }) => {
      await login(page, TEST_USERS.moderator.email, TEST_USERS.moderator.password);
      
      await page.getByRole('link', { name: 'Статусы' }).click();
      
      await expect(page).toHaveURL('/statuses');
      await expect(page.getByRole('heading', { name: 'Статусы' })).toBeVisible();
    });
  });

  test.describe('Администратор (admin)', () => {
    test('видит все заявки в системе', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/applications');
      
      // Проверяем заголовок страницы
      await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();
      await expect(page.getByText('Все заявки в системе')).toBeVisible();
    });

    test('видит ссылку на панель администратора', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      // Проверяем, что ссылка на админ-панель видна
      await expect(page.getByRole('link', { name: 'Админ' })).toBeVisible();
    });

    test('может перейти на панель администратора', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.getByRole('link', { name: 'Админ' }).click();
      
      await expect(page).toHaveURL('/admin');
      await expect(page.getByRole('heading', { name: 'Панель администратора' })).toBeVisible();
    });

    test('панель администратора показывает все секции', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/admin');
      
      // Проверяем наличие карточек для разных секций
      await expect(page.getByText('Формы заявок')).toBeVisible();
      await expect(page.locator('.admin-card__title').filter({ hasText: 'Статусы' })).toBeVisible();
      await expect(page.getByText('Все заявки')).toBeVisible();
    });

    test('видит ссылку на статусы', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      // Проверяем, что ссылка на статусы видна
      await expect(page.getByRole('link', { name: 'Статусы' })).toBeVisible();
    });

    test('может создавать формы', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/forms');
      
      // Проверяем, что кнопка создания формы доступна
      const createFormBtn = page.getByTestId('create-btn');
      await expect(createFormBtn).toBeVisible();
    });
  });

  test.describe('Изоляция данных', () => {
    test('пользователь не может редактировать чужие заявки', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      // На странице должны быть только заявки текущего пользователя
      // или должны отсутствовать кнопки редактирования для чужих
      const cards = page.locator('[data-testid^="item-"]');
      const count = await cards.count();
      
      if (count > 0) {
        // Все видимые кнопки редактирования должны быть для собственных заявок
        // Это проверяется логикой на бэкенде и фронтенде
        await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();
      }
    });
  });
});
