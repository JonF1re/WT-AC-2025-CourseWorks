import { test, expect, Page } from '@playwright/test';

test.describe('Alert Rules Page', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.goto('/alert-rules');
  });

  test('should load page with correct title', async () => {
    await expect(page.locator('h1')).toContainText('Правила оповещений');
    await expect(page.locator('p')).toContainText('Настройте пороговые значения для отслеживания метрик');
  });

  test('should display tabs for rules and alerts', async () => {
    const rulesTab = page.locator('button:has-text("Правила")');
    const alertsTab = page.locator('button:has-text("Оповещения")');
    
    await expect(rulesTab).toBeVisible();
    await expect(alertsTab).toBeVisible();
    await expect(rulesTab).toHaveClass(/active/);
  });

  test('should fetch and display metrics dropdown', async () => {
    await page.waitForSelector('select option:not(:first-child)');
    const metricOptions = page.locator('select option:not(:first-child)');
    await expect(metricOptions.first()).toBeVisible();
  });

  test('should show error when saving rule without required fields', async () => {
    await page.click('button[type="submit"]');
    
    const errorAlert = page.locator('.alert.critical');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/Выберите метрику|Заполните шаблон/);
  });

  test('should create new alert rule with valid data', async () => {
    await page.selectOption('select:first-of-type', { index: 1 });
    await page.selectOption('select:nth-of-type(2)', 'warning');
    await page.selectOption('select:nth-of-type(3)', '>');
    await page.fill('input[type="number"]', '50');
    await page.fill('input[type="text"]', 'Temperature превысила порог');
    
    await page.click('button[type="submit"]');
    
    const successIndicator = page.locator('table tbody tr:first-child');
    await expect(successIndicator).toBeVisible();
    await expect(successIndicator).toContainText('Temperature превысила порог');
  });

  test('should switch to alerts tab and display alerts', async () => {
    await page.click('button:has-text("Оповещения")');
    
    const alertsTab = page.locator('button:has-text("Оповещения")');
    await expect(alertsTab).toHaveClass(/active/);
    
    const alertsContent = page.locator('.card:has-text("Оповещения")');
    await expect(alertsContent).toBeVisible();
  });

  test('should edit existing rule', async () => {
    await page.waitForSelector('table tbody tr');
    await page.click('table tbody tr:first-child button:has-text("Редакт.")');
    
    const formTitle = page.locator('h2:has-text("Редактирование правила")');
    await expect(formTitle).toBeVisible();
    
    await page.fill('input[type="number"]', '75');
    await page.click('button[type="submit"]');
    
    await expect(formTitle).not.toBeVisible();
    const updatedValue = page.locator('table tbody tr:first-child span:has-text("> 75")');
    await expect(updatedValue).toBeVisible();
  });

  test('should delete rule with confirmation', async () => {
    page.on('dialog', dialog => dialog.accept());
    
    await page.waitForSelector('table tbody tr');
    const initialCount = await page.locator('table tbody tr').count();
    
    await page.click('table tbody tr:first-child button:has-text("Удалить")');
    
    await page.waitForTimeout(500);
    const finalCount = await page.locator('table tbody tr').count();
    
    expect(finalCount).toBeLessThan(initialCount);
  });

  test('should handle WebSocket alert notifications', async () => {
    await page.click('button:has-text("Оповещения")');
    
    const initialAlertCount = await page.locator('.alert.info, .alert.warning, .alert.critical').count();
    
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('socket-alert', {
        detail: {
          id: 'test-alert-1',
          metric_id: 'test-metric',
          reading_id: 'test-reading',
          level: 'critical',
          status: 'new',
          message: 'Test alert from WebSocket',
          created_at: new Date().toISOString()
        }
      }));
    });
    
    await page.waitForTimeout(1000);
    
    const updatedAlertCount = await page.locator('.alert.info, .alert.warning, .alert.critical').count();
    expect(updatedAlertCount).toBeGreaterThan(initialAlertCount);
  });

  test('should acknowledge and close alerts', async () => {
    await page.click('button:has-text("Оповещения")');
    
    const newAlert = page.locator('.alert:has-text("Новый")').first();
    await expect(newAlert).toBeVisible();
    
    await newAlert.locator('button:has-text("Прочитано")').click();
    
    await page.waitForTimeout(500);
    await expect(newAlert.locator('span:has-text("Подтверждён")')).toBeVisible();
    
    await newAlert.locator('button:has-text("Закрыть")').click();
    await page.waitForTimeout(500);
    await expect(newAlert.locator('span:has-text("Закрыт")')).toBeVisible();
  });

  test('should cancel rule editing', async () => {
    await page.waitForSelector('table tbody tr');
    await page.click('table tbody tr:first-child button:has-text("Редакт.")');
    
    await expect(page.locator('h2:has-text("Редактирование правила")')).toBeVisible();
    
    await page.click('button:has-text("Отменить")');
    
    await expect(page.locator('h2:has-text("Новое правило")')).toBeVisible();
  });

  test('should display different alert levels with correct styling', async () => {
    const testLevels = ['info', 'warning', 'critical'];
    
    for (const level of testLevels) {
      await page.evaluate((level) => {
        window.dispatchEvent(new CustomEvent('socket-alert', {
          detail: {
            id: `test-${level}-alert`,
            metric_id: 'test-metric',
            reading_id: 'test-reading',
            level: level,
            status: 'new',
            message: `Test ${level} alert`,
            created_at: new Date().toISOString()
          }
        }));
      }, level);
    }
    
    await page.waitForTimeout(1000);
    
    for (const level of testLevels) {
      const alertElement = page.locator(`.alert.${level}:has-text("Test ${level} alert")`);
      await expect(alertElement).toBeVisible();
    }
  });
});