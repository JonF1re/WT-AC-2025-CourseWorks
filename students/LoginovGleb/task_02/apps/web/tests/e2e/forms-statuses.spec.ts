import { test, expect, TEST_USERS, login } from './fixtures';

test.describe('Формы заявок (Forms)', () => {
  test.describe('Публичный доступ', () => {
    test('неавторизованный пользователь может просматривать список форм', async ({ page }) => {
      await page.goto('/forms');
      
      await expect(page.getByRole('heading', { name: 'Формы заявок' })).toBeVisible();
    });

    test('формы отображаются в виде карточек', async ({ page }) => {
      await page.goto('/forms');
      
      // Ожидаем, что есть хотя бы одна форма из seed
      const formCards = page.locator('.form-card, [data-testid^="form-"]');
      await expect(formCards.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Управление формами (admin)', () => {
    test('админ видит кнопку создания формы', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/forms');
      
      const createBtn = page.getByTestId('create-btn');
      await expect(createBtn).toBeVisible();
    });

    test('админ может перейти к созданию формы', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/forms');
      await page.getByTestId('create-btn').click();
      
      await expect(page).toHaveURL('/forms/new');
      await expect(page.getByRole('heading', { name: /Новая форма|Создание формы/ })).toBeVisible();
    });

    test('обычный пользователь не видит кнопку создания формы', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/forms');
      
      const createBtn = page.getByTestId('create-btn');
      await expect(createBtn).not.toBeVisible();
    });
  });

  test.describe('Детальный просмотр формы', () => {
    test('можно открыть детальный просмотр формы', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/forms');
      
      // Кликаем на первую форму
      const viewBtn = page.getByTestId('view-btn').first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        
        // Должны перейти на страницу формы
        await expect(page).toHaveURL(/\/forms\/[\w-]+$/);
      }
    });
  });
});

test.describe('Статусы (Statuses)', () => {
  test.describe('Доступ к статусам', () => {
    test('обычный пользователь не имеет доступа к статусам', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      // Проверяем, что ссылки нет в меню
      await expect(page.getByRole('link', { name: 'Статусы' })).not.toBeVisible();
    });

    test('модератор имеет доступ к статусам', async ({ page }) => {
      await login(page, TEST_USERS.moderator.email, TEST_USERS.moderator.password);
      
      await page.goto('/statuses');
      
      await expect(page.getByRole('heading', { name: 'Статусы' })).toBeVisible();
    });

    test('админ имеет доступ к статусам', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/statuses');
      
      await expect(page.getByRole('heading', { name: 'Статусы' })).toBeVisible();
    });

    test('статусы отображаются в списке', async ({ page }) => {
      await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
      
      await page.goto('/statuses');
      
      // Должны быть статусы из seed
      await expect(page.getByText('draft')).toBeVisible();
      await expect(page.getByText('pending')).toBeVisible();
      await expect(page.getByText('approved')).toBeVisible();
    });
  });
});
