import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.goto('/admin/metrics');
}

async function setupMetricsMock(page: Page) {
  await page.route('**/metrics', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          { 
            id: 'metric-1', 
            name: 'Temperature', 
            unit: '°C', 
            device: { id: 'device-1', name: 'Sensor A', description: 'Outdoor sensor' },
            created_at: '2024-01-15T10:30:00Z'
          },
          { 
            id: 'metric-2', 
            name: 'Humidity', 
            unit: '%', 
            device: { id: 'device-2', name: 'Sensor B', description: 'Indoor sensor' },
            created_at: '2024-01-20T14:45:00Z'
          }
        ],
        total: 2,
        page: 1,
        limit: 10
      })
    });
  });

  await page.route('**/devices', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          { id: 'device-1', name: 'Sensor A', description: 'Outdoor sensor' },
          { id: 'device-2', name: 'Sensor B', description: 'Indoor sensor' },
          { id: 'device-3', name: 'Sensor C', description: 'Basement sensor' }
        ],
        total: 3,
        page: 1,
        limit: 10
      })
    });
  });
}

test.describe('Metrics Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await setupMetricsMock(page);
  });

  test('should load metrics page with correct title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Управление метриками');
    await expect(page.locator('p')).toContainText('Создавайте и управляйте метриками для мониторинга устройств');
  });

  test('should display metrics list table with correct columns', async ({ page }) => {
    await expect(page.locator('table th:has-text("Метрика")')).toBeVisible();
    await expect(page.locator('table th:has-text("Единицы")')).toBeVisible();
    await expect(page.locator('table th:has-text("Устройство")')).toBeVisible();
    await expect(page.locator('table th:has-text("Создана")')).toBeVisible();
    await expect(page.locator('table th:has-text("Действия")')).toBeVisible();
  });

  test('should display metrics in the table', async ({ page }) => {
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount(2);
    
    await expect(tableRows.nth(0)).toContainText('Temperature');
    await expect(tableRows.nth(0)).toContainText('°C');
    await expect(tableRows.nth(0)).toContainText('Sensor A');
    
    await expect(tableRows.nth(1)).toContainText('Humidity');
    await expect(tableRows.nth(1)).toContainText('%');
    await expect(tableRows.nth(1)).toContainText('Sensor B');
  });

  test('should display device descriptions in metrics table', async ({ page }) => {
    const firstRow = page.locator('table tbody tr').first();
    await expect(firstRow).toContainText('Outdoor sensor');
  });

  test('should show form for creating new metric', async ({ page }) => {
    await expect(page.locator('h2:has-text("Добавить новую метрику")')).toBeVisible();
    
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    await expect(page.locator('label[for="metric-name"]')).toContainText('Название метрики');
    await expect(page.locator('label[for="metric-unit"]')).toContainText('Единицы измерения');
    await expect(page.locator('label[for="metric-device"]')).toContainText('Устройство');
    
    const nameInput = page.locator('#metric-name');
    const unitInput = page.locator('#metric-unit');
    const deviceSelect = page.locator('#metric-device');
    
    await expect(nameInput).toBeVisible();
    await expect(unitInput).toBeVisible();
    await expect(deviceSelect).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    const errorAlert = page.locator('.alert.critical');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Название метрики обязательно');
  });

  test('should show validation error for missing device selection', async ({ page }) => {
    await page.fill('#metric-name', 'Test Metric');
    await page.fill('#metric-unit', 'units');
    await page.click('button[type="submit"]');
    
    const errorAlert = page.locator('.alert.critical');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Выберите устройство');
  });

  test('should create new metric successfully', async ({ page }) => {
    await page.route('**/metrics', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: { 
              id: 'metric-new', 
              name: 'Pressure', 
              unit: 'hPa',
              device: { id: 'device-1', name: 'Sensor A' }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.fill('#metric-name', 'Pressure');
    await page.fill('#metric-unit', 'hPa');
    await page.selectOption('#metric-device', 'device-1');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toHaveAttribute('aria-busy', 'true');
    
    await submitButton.click();
    
    await expect(submitButton).toHaveAttribute('aria-busy', 'true');
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('#metric-name')).toHaveValue('');
    await expect(page.locator('#metric-unit')).toHaveValue('');
    await expect(page.locator('#metric-device')).toHaveValue('');
  });

  test('should edit existing metric', async ({ page }) => {
    await page.click('table tbody tr:first-child button:has-text("Редакт.")');
    
    await expect(page.locator('h2:has-text("Редактирование метрики")')).toBeVisible();
    await expect(page.locator('span:has-text("Режим редактирования")')).toBeVisible();
    
    const nameInput = page.locator('#metric-name');
    await expect(nameInput).toHaveValue('Temperature');
    
    const unitInput = page.locator('#metric-unit');
    await expect(unitInput).toHaveValue('°C');
    
    const deviceSelect = page.locator('#metric-device');
    await expect(deviceSelect).toHaveValue('device-1');
  });

  test('should update metric when editing', async ({ page }) => {
    await page.route('**/metrics/metric-1', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: { 
              id: 'metric-1', 
              name: 'Updated Temp', 
              unit: '°F',
              device: { id: 'device-1', name: 'Sensor A' }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.click('table tbody tr:first-child button:has-text("Редакт.")');
    
    await page.fill('#metric-name', 'Updated Temp');
    await page.fill('#metric-unit', '°F');
    
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('h2:has-text("Добавить новую метрику")')).toBeVisible();
  });

  test('should cancel metric editing', async ({ page }) => {
    await page.click('table tbody tr:first-child button:has-text("Редакт.")');
    
    await expect(page.locator('h2:has-text("Редактирование метрики")')).toBeVisible();
    
    await page.click('button:has-text("Отменить")');
    
    await expect(page.locator('h2:has-text("Добавить новую метрику")')).toBeVisible();
    await expect(page.locator('#metric-name')).toHaveValue('');
  });

  test('should delete metric with confirmation', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());
    
    await page.route('**/metrics/metric-1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' })
        });
      } else {
        await route.continue();
      }
    });

    const initialRows = page.locator('table tbody tr');
    const initialCount = await initialRows.count();
    
    await page.click('table tbody tr:first-child button:has-text("Удалить")');
    
    await page.waitForTimeout(500);
  });

  test('should display loading state when refreshing', async ({ page }) => {
    await page.route('**/metrics', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    const refreshButton = page.locator('button:has-text("Обновить")');
    await refreshButton.click();
    
    await expect(refreshButton).toContainText('Загрузка...');
    await expect(page.locator('div:has-text("Загрузка метрик...")')).toBeVisible();
  });

  test('should handle empty metrics list', async ({ page }) => {
    await page.route('**/metrics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [],
          total: 0,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    
    const emptyState = page.locator('div:has-text("Метрики не найдены")');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('Добавьте первую метрику');
  });

  test('should show error message when API fails', async ({ page }) => {
    await page.route('**/metrics', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'internal_error', message: 'Server error' }
        })
      });
    });

    await page.reload();
    
    const errorAlert = page.locator('.alert.critical');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Ошибка загрузки данных');
  });

  test('should populate device dropdown from API', async ({ page }) => {
    const deviceSelect = page.locator('#metric-device');
    await deviceSelect.click();
    
    await expect(page.locator('option:has-text("Sensor A (Outdoor sensor)")')).toBeVisible();
    await expect(page.locator('option:has-text("Sensor B (Indoor sensor)")')).toBeVisible();
    await expect(page.locator('option:has-text("Sensor C (Basement sensor)")')).toBeVisible();
  });

  test('should format date in metrics table', async ({ page }) => {
    const dateCell = page.locator('table tbody tr:first-child td:nth-child(4)');
    await expect(dateCell).toContainText('15.01.2024');
  });

  test('should highlight row being edited', async ({ page }) => {
    await page.click('table tbody tr:first-child button:has-text("Редакт.")');
    
    const editingRow = page.locator('table tbody tr:first-child');
    await expect(editingRow).toContainText('Редактируется');
    
    const editingBadge = editingRow.locator('span:has-text("Редактируется")');
    await expect(editingBadge).toBeVisible();
    await expect(editingBadge).toHaveCSS('background-color', /rgba\(59, 130, 246, 0.2\)/);
  });

  test('should display unit badges with correct styling', async ({ page }) => {
    const unitBadge1 = page.locator('table tbody tr:first-child span:has-text("°C")');
    const unitBadge2 = page.locator('table tbody tr:nth-child(2) span:has-text("%")');
    
    await expect(unitBadge1).toBeVisible();
    await expect(unitBadge2).toBeVisible();
    
    await expect(unitBadge1).toHaveCSS('background-color', /rgba\(34, 197, 94, 0.2\)/);
    await expect(unitBadge2).toHaveCSS('background-color', /rgba\(34, 197, 94, 0.2\)/);
  });

  test('should show loading spinner on form submission', async ({ page }) => {
    await page.route('**/metrics', async route => {
      if (route.request().method() === 'POST') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    await page.fill('#metric-name', 'Test Metric');
    await page.fill('#metric-unit', 'units');
    await page.selectOption('#metric-device', 'device-1');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    const spinner = submitButton.locator('div[style*="animation: spin"]');
    await expect(spinner).toBeVisible();
    
    await expect(submitButton).toHaveAttribute('aria-busy', 'true');
  });

  test('should clear error message when close button clicked', async ({ page }) => {
    await page.click('button[type="submit"]');
    
    const errorAlert = page.locator('.alert.critical');
    await expect(errorAlert).toBeVisible();
    
    const closeButton = errorAlert.locator('button:has-text("✕")');
    await closeButton.click();
    
    await expect(errorAlert).not.toBeVisible();
  });
});