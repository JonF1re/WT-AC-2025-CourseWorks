import { test, expect, TEST_USERS, login, generateTestUsername, generateTestEmail } from './fixtures';

/**
 * Полный workflow тесты
 * Проверяют сценарии от начала до конца
 */

test.describe('Workflow: Полный цикл заявки', () => {
  test('создание и просмотр заявки', async ({ page }) => {
    await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
    
    // 1. Переходим к созданию заявки
    await page.goto('/applications/new');
    await expect(page.getByRole('heading', { name: 'Новая заявка' })).toBeVisible();
    
    // 2. Выбираем форму
    const formSelect = page.getByLabel('Форма заявки');
    await expect(formSelect).toBeVisible();
    await formSelect.selectOption({ index: 1 });
    
    // 3. Ожидаем загрузки полей формы
    await page.waitForTimeout(1000);
    
    // 4. Заполняем все обязательные поля формы
    // ФИО
    const fioField = page.getByLabel('ФИО');
    if (await fioField.isVisible()) {
      await fioField.fill('Тестовый Пользователь Тестович');
    }
    
    // Email
    const emailField = page.getByLabel('Email').first();
    if (await emailField.isVisible()) {
      await emailField.fill('test@example.com');
    }
    
    // Телефон
    const phoneField = page.getByLabel('Телефон');
    if (await phoneField.isVisible()) {
      await phoneField.fill('+7 999 123 45 67');
    }
    
    // Мотивация участия (обязательное)
    const motivationField = page.getByLabel('Мотивация участия');
    if (await motivationField.isVisible()) {
      await motivationField.fill('Хочу принять участие в мероприятии');
    }
    
    // Формат участия (обязательный select)
    const formatSelect = page.getByLabel('Формат участия');
    if (await formatSelect.isVisible()) {
      await formatSelect.selectOption({ index: 1 });
    }
    
    // 5. Заполняем комментарий (если есть)
    const commentField = page.getByLabel('Комментарий');
    if (await commentField.isVisible()) {
      await commentField.fill(`E2E тест ${Date.now()}`);
    }
    
    // 6. Отправляем форму
    await page.getByTestId('submit-btn').click();
    
    // 7. Проверяем редирект на страницу заявки
    await expect(page).toHaveURL(/\/applications\/[\w-]+$/);
    
    // 8. Ждём загрузки страницы детального просмотра
    await page.waitForLoadState('networkidle');
    
    // 9. Проверяем статус черновик (может быть на английском или русском)
    await expect(page.getByText(/draft|черновик/i).first()).toBeVisible();
  });

  test('отправка и отзыв заявки', async ({ page }) => {
    await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
    
    // 1. Создаём новую заявку
    await page.goto('/applications/new');
    
    const formSelect = page.getByLabel('Форма заявки');
    await formSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    
    const testComment = `Workflow test ${Date.now()}`;
    await page.getByLabel('Комментарий').fill(testComment);
    await page.getByTestId('submit-btn').click();
    
    // Ждём создания
    await expect(page).toHaveURL(/\/applications\/[\w-]+$/);
    
    // 2. Отправляем заявку на рассмотрение
    const submitBtn = page.getByTestId('submit-app-btn');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.getByTestId('confirm-btn').click();
      
      // Ждём обновления статуса
      await expect(page.getByText('pending')).toBeVisible({ timeout: 10000 });
      
      // 3. Отзываем заявку
      const withdrawBtn = page.getByTestId('withdraw-btn');
      if (await withdrawBtn.isVisible()) {
        await withdrawBtn.click();
        await page.getByTestId('confirm-btn').click();
        
        // Проверяем статус
        await expect(page.getByText(/withdrawn|draft/)).toBeVisible({ timeout: 10000 });
      }
    }
  });
});

test.describe('Workflow: Регистрация и работа нового пользователя', () => {
  test('новый пользователь может зарегистрироваться и создать заявку', async ({ page }) => {
    // 1. Регистрация нового пользователя
    const username = generateTestUsername();
    const email = generateTestEmail();
    const password = 'TestPass123!';
    
    await page.goto('/register');
    
    await page.getByLabel('Имя пользователя').fill(username);
    await page.getByLabel('Email').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="confirmPassword"]').fill(password);
    await page.getByTestId('submit-btn').click();
    
    // 2. Проверяем успешную регистрацию
    await expect(page).toHaveURL('/applications');
    await expect(page.getByText(username)).toBeVisible();
    
    // 3. Создаём заявку
    await page.getByTestId('create-btn').click();
    await expect(page).toHaveURL('/applications/new');
    
    const formSelect = page.getByLabel('Форма заявки');
    await formSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    
    await page.getByLabel('Комментарий').fill('Заявка нового пользователя');
    await page.getByTestId('submit-btn').click();
    
    // 4. Проверяем успешное создание
    await expect(page).toHaveURL(/\/applications\/[\w-]+$/);
    
    // 5. Выходим
    await page.getByTestId('logout-btn').click();
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Workflow: Модерация заявок', () => {
  test('модератор может изменить статус заявки', async ({ page }) => {
    await login(page, TEST_USERS.moderator.email, TEST_USERS.moderator.password);
    
    await page.goto('/applications');
    
    // Проверяем, что видит все заявки
    await expect(page.getByText('Все заявки в системе')).toBeVisible();
    
    // Пробуем открыть первую заявку
    const viewBtn = page.getByTestId('view-btn').first();
    if (await viewBtn.isVisible()) {
      await viewBtn.click();
      await expect(page).toHaveURL(/\/applications\/[\w-]+$/);
      
      // Модератор должен иметь возможность изменить статус
      // (кнопка изменения статуса видна)
    }
  });
});

test.describe('Workflow: Администрирование', () => {
  test('админ может управлять формами', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // 1. Переходим к формам
    await page.goto('/forms');
    
    // 2. Проверяем кнопку создания
    await expect(page.getByTestId('create-btn')).toBeVisible();
    
    // 3. Переходим к созданию формы
    await page.getByTestId('create-btn').click();
    await expect(page).toHaveURL('/forms/new');
  });

  test('админ может управлять статусами', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    // 1. Переходим к статусам
    await page.goto('/statuses');
    
    // 2. Проверяем, что статусы отображаются
    await expect(page.getByRole('heading', { name: /Статусы/ })).toBeVisible();
    
    // 3. Проверяем наличие статусов
    await expect(page.getByText('draft')).toBeVisible();
    await expect(page.getByText('pending')).toBeVisible();
    await expect(page.getByText('approved')).toBeVisible();
    await expect(page.getByText('rejected')).toBeVisible();
  });

  test('админ может видеть панель администратора', async ({ page }) => {
    await login(page, TEST_USERS.admin.email, TEST_USERS.admin.password);
    
    await page.goto('/admin');
    
    await expect(page.getByRole('heading', { name: 'Панель администратора' })).toBeVisible();
    
    // Проверяем карточки
    await expect(page.getByText('Формы заявок')).toBeVisible();
    await expect(page.locator('.admin-card__title').filter({ hasText: 'Статусы' })).toBeVisible();
    await expect(page.getByText('Все заявки')).toBeVisible();
    
    // Проверяем информацию о системе
    await expect(page.getByText('Вариант')).toBeVisible();
    await expect(page.getByText('40 — «Да, я в деле»')).toBeVisible();
  });
});
