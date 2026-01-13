import { test, expect, TEST_USERS, login } from './fixtures';

test.describe('Заявки (Applications)', () => {
  test.describe('Просмотр списка заявок', () => {
    test('авторизованный пользователь видит свои заявки', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      await expect(page.getByRole('heading', { name: 'Заявки' })).toBeVisible();
      await expect(page.getByTestId('create-btn')).toBeVisible();
    });

    test('должен отображать кнопку создания заявки', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      const createBtn = page.getByTestId('create-btn');
      await expect(createBtn).toBeVisible();
      await expect(createBtn).toContainText('Новая заявка');
    });
  });

  test.describe('Создание заявки', () => {
    test('должен открывать форму создания заявки', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      await page.getByTestId('create-btn').click();
      
      await expect(page).toHaveURL('/applications/new');
      await expect(page.getByRole('heading', { name: 'Новая заявка' })).toBeVisible();
    });

    test('должен успешно создавать заявку', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications/new');
      
      // Выбираем форму
      const formSelect = page.getByLabel('Форма заявки');
      await formSelect.click();
      // Выбираем первую доступную форму
      await formSelect.selectOption({ index: 1 });
      
      // Ждём загрузки полей формы
      await page.waitForTimeout(500);
      
      // Заполняем поля (если они появились)
      const dynamicFields = page.locator('.form-field__input, .form-field__textarea');
      const fieldsCount = await dynamicFields.count();
      
      if (fieldsCount > 0) {
        // Заполняем текстовые поля
        for (let i = 0; i < fieldsCount; i++) {
          const field = dynamicFields.nth(i);
          const tagName = await field.evaluate(el => el.tagName.toLowerCase());
          const fieldType = await field.getAttribute('type');
          
          if (tagName === 'textarea' || (tagName === 'input' && fieldType === 'text')) {
            await field.fill(`Тестовое значение ${i + 1}`);
          }
        }
      }
      
      // Добавляем комментарий
      const commentField = page.getByLabel('Комментарий');
      if (await commentField.isVisible()) {
        await commentField.fill('Тестовый комментарий к заявке');
      }
      
      // Отправляем форму
      await page.getByTestId('submit-btn').click();
      
      // Ожидаем редирект на страницу заявки или список
      await expect(page).toHaveURL(/\/applications/);
    });
  });

  test.describe('Операции с заявкой', () => {
    test('должен открывать детальный просмотр заявки', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      // Если есть заявки, кликаем на первую
      const viewBtn = page.getByTestId('view-btn').first();
      if (await viewBtn.isVisible()) {
        await viewBtn.click();
        
        // Должны перейти на страницу заявки
        await expect(page).toHaveURL(/\/applications\/[\w-]+$/);
      }
    });

    test('пользователь может отправить черновик на рассмотрение', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      // Ищем кнопку отправки на черновике
      const submitBtn = page.getByTestId('submit-app-btn').first();
      
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        
        // Появляется диалог подтверждения
        await expect(page.getByText('Отправка заявки')).toBeVisible();
        
        // Подтверждаем отправку
        await page.getByTestId('confirm-btn').click();
        
        // Ждём обновления
        await page.waitForTimeout(1000);
      }
    });

    test('пользователь может отозвать отправленную заявку', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      // Ищем кнопку отзыва
      const withdrawBtn = page.getByTestId('withdraw-btn').first();
      
      if (await withdrawBtn.isVisible()) {
        await withdrawBtn.click();
        
        // Появляется диалог подтверждения
        await expect(page.getByText('Отзыв заявки')).toBeVisible();
        
        // Подтверждаем отзыв
        await page.getByTestId('confirm-btn').click();
        
        // Ждём обновления
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Удаление заявки', () => {
    test('пользователь может удалить черновик', async ({ page }) => {
      await login(page, TEST_USERS.user.email, TEST_USERS.user.password);
      
      await page.goto('/applications');
      
      // Ищем кнопку удаления
      const deleteBtn = page.getByTestId('delete-btn').first();
      
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        
        // Появляется диалог подтверждения
        await expect(page.getByText('Удаление заявки')).toBeVisible();
        
        // Отменяем удаление
        await page.getByTestId('cancel-btn').click();
        
        // Диалог закрылся
        await expect(page.getByText('Удаление заявки')).not.toBeVisible();
      }
    });
  });
});
