import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.goto('/alert-rules');
}

async function setupAlertsMock(page: Page) {
  await page.route('**/metrics', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          { id: 'metric-1', name: 'Temperature', unit: '°C' },
          { id: 'metric-2', name: 'Humidity', unit: '%' }
        ],
        total: 2,
        page: 1,
        limit: 10
      })
    });
  });

  await page.route('**/alerts/rules', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            id: 'rule-1',
            metric_id: 'metric-1',
            condition: '>',
            threshold: 30,
            level: 'warning',
            message_template: 'Temperature high: {value}°C'
          }
        ],
        total: 1,
        page: 1,
        limit: 10
      })
    });
  });

  await page.route('**/alerts', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'ok',
        data: [
          {
            id: 'alert-1',
            metric_id: 'metric-1',
            reading_id: 'reading-1',
            level: 'warning',
            status: 'new',
            message: 'Temperature high: 32°C',
            created_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 'alert-2',
            metric_id: 'metric-1',
            reading_id: 'reading-2',
            level: 'critical',
            status: 'acknowledged',
            message: 'Temperature critical: 40°C',
            created_at: '2024-01-15T09:15:00Z'
          },
          {
            id: 'alert-3',
            metric_id: 'metric-2',
            reading_id: 'reading-3',
            level: 'info',
            status: 'closed',
            message: 'Humidity normal: 50%',
            created_at: '2024-01-14T14:20:00Z'
          }
        ],
        total: 3,
        page: 1,
        limit: 10
      })
    });
  });
}

test.describe('Alerts List', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await setupAlertsMock(page);
  });

  test('should switch to alerts tab', async ({ page }) => {
    const alertsTab = page.locator('button:has-text("Оповещения")');
    await alertsTab.click();
    
    await expect(alertsTab).toHaveCSS('background', /var\(--primary\)/);
    await expect(page.locator('h2:has-text("Оповещения")')).toBeVisible();
  });

  test('should display alerts count in tab', async ({ page }) => {
    const alertsTab = page.locator('button:has-text("Оповещения")');
    await expect(alertsTab).toContainText('Оповещения (1)');
  });

  test('should show alerts list with correct columns', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alerts = page.locator('.alert');
    await expect(alerts).toHaveCount(3);
    
    await expect(alerts.nth(0)).toContainText('Temperature high: 32°C');
    await expect(alerts.nth(1)).toContainText('Temperature critical: 40°C');
    await expect(alerts.nth(2)).toContainText('Humidity normal: 50%');
  });

  test('should display alert status badges', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alert1 = page.locator('.alert').nth(0);
    const alert2 = page.locator('.alert').nth(1);
    const alert3 = page.locator('.alert').nth(2);
    
    await expect(alert1.locator('span:has-text("Новый")')).toBeVisible();
    await expect(alert2.locator('span:has-text("Подтверждён")')).toBeVisible();
    await expect(alert3.locator('span:has-text("Закрыт")')).toBeVisible();
    
    await expect(alert1.locator('span:has-text("Новый")')).toHaveCSS('background-color', '#ef4444');
    await expect(alert2.locator('span:has-text("Подтверждён")')).toHaveCSS('background-color', '#f59e0b');
    await expect(alert3.locator('span:has-text("Закрыт")')).toHaveCSS('background-color', '#22c55e');
  });

  test('should display alert levels with correct styling', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alert1 = page.locator('.alert.warning');
    const alert2 = page.locator('.alert.critical');
    const alert3 = page.locator('.alert.info');
    
    await expect(alert1).toBeVisible();
    await expect(alert2).toBeVisible();
    await expect(alert3).toBeVisible();
    
    await expect(alert1).toHaveCSS('background', /rgba\(245, 158, 11, 0.15\)/);
    await expect(alert2).toHaveCSS('background', /rgba\(239, 68, 68, 0.15\)/);
    await expect(alert3).toHaveCSS('background', /#1e293b/);
  });

  test('should format alert dates correctly', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alertDates = page.locator('.alert div:has-text(/\\d{2}\\.\\d{2}\\. \\d{2}:\\d{2}/)');
    await expect(alertDates).toHaveCount(3);
    
    await expect(alertDates.nth(0)).toContainText('15.01. 10:30');
    await expect(alertDates.nth(1)).toContainText('15.01. 09:15');
    await expect(alertDates.nth(2)).toContainText('14.01. 14:20');
  });

  test('should show action buttons only for new alerts', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alert1 = page.locator('.alert').nth(0);
    const alert2 = page.locator('.alert').nth(1);
    const alert3 = page.locator('.alert').nth(2);
    
    await expect(alert1.locator('button:has-text("Прочитано")')).toBeVisible();
    await expect(alert1.locator('button:has-text("Закрыть")')).toBeVisible();
    
    await expect(alert2.locator('button:has-text("Прочитано")')).not.toBeVisible();
    await expect(alert2.locator('button:has-text("Закрыть")')).not.toBeVisible();
    
    await expect(alert3.locator('button:has-text("Прочитано")')).not.toBeVisible();
    await expect(alert3.locator('button:has-text("Закрыть")')).not.toBeVisible();
  });

  test('should acknowledge alert', async ({ page }) => {
    await page.route('**/alerts/alert-1/acknowledge', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' })
      });
    });

    await page.click('button:has-text("Оповещения")');
    
    const alert = page.locator('.alert').nth(0);
    const acknowledgeButton = alert.locator('button:has-text("Прочитано")');
    await acknowledgeButton.click();
    
    await page.waitForTimeout(500);
    
    await expect(alert.locator('span:has-text("Подтверждён")')).toBeVisible();
    await expect(acknowledgeButton).not.toBeVisible();
    await expect(alert.locator('button:has-text("Закрыть")')).not.toBeVisible();
  });

  test('should close alert', async ({ page }) => {
    await page.route('**/alerts/alert-1/close', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' })
      });
    });

    await page.click('button:has-text("Оповещения")');
    
    const alert = page.locator('.alert').nth(0);
    const closeButton = alert.locator('button:has-text("Закрыть")');
    await closeButton.click();
    
    await page.waitForTimeout(500);
    
    await expect(alert.locator('span:has-text("Закрыт")')).toBeVisible();
    await expect(alert.locator('button:has-text("Прочитано")')).not.toBeVisible();
    await expect(closeButton).not.toBeVisible();
  });

  test('should handle empty alerts list', async ({ page }) => {
    await page.route('**/alerts', async route => {
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

    await page.click('button:has-text("Оповещения")');
    
    const emptyState = page.locator('p:has-text("Оповещений пока нет")');
    await expect(emptyState).toBeVisible();
    
    const alertsTab = page.locator('button:has-text("Оповещения")');
    await expect(alertsTab).toContainText('Оповещения (0)');
  });

  test('should automatically switch to alerts tab on new WebSocket alert', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    await page.evaluate(() => {
      const socketEvent = new CustomEvent('socket-alert', {
        detail: {
          id: 'alert-new',
          metric_id: 'metric-1',
          reading_id: 'reading-new',
          level: 'critical',
          status: 'new',
          message: 'New critical alert via WebSocket',
          created_at: new Date().toISOString()
        }
      });
      window.dispatchEvent(socketEvent);
    });
    
    await page.waitForTimeout(500);
    
    const alertsTab = page.locator('button:has-text("Оповещения")');
    await expect(alertsTab).toHaveCSS('background', /var\(--primary\)/);
    
    const newAlert = page.locator('.alert.critical:has-text("New critical alert via WebSocket")');
    await expect(newAlert).toBeVisible();
  });

  test('should add new WebSocket alert to top of list', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const initialAlerts = page.locator('.alert');
    const initialCount = await initialAlerts.count();
    
    await page.evaluate(() => {
      const socketEvent = new CustomEvent('socket-alert', {
        detail: {
          id: 'alert-new',
          metric_id: 'metric-1',
          reading_id: 'reading-new',
          level: 'info',
          status: 'new',
          message: 'New WebSocket alert',
          created_at: new Date().toISOString()
        }
      });
      window.dispatchEvent(socketEvent);
    });
    
    await page.waitForTimeout(500);
    
    const updatedAlerts = page.locator('.alert');
    const updatedCount = await updatedAlerts.count();
    
    expect(updatedCount).toBe(initialCount + 1);
    
    const firstAlert = updatedAlerts.nth(0);
    await expect(firstAlert).toContainText('New WebSocket alert');
  });

  test('should limit alerts list to 50 items', async ({ page }) => {
    await page.route('**/alerts', async route => {
      const alerts = Array.from({ length: 55 }, (_, i) => ({
        id: `alert-${i}`,
        metric_id: 'metric-1',
        reading_id: `reading-${i}`,
        level: 'info',
        status: 'new',
        message: `Alert ${i}`,
        created_at: new Date().toISOString()
      }));
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: alerts,
          total: 55,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.click('button:has-text("Оповещения")');
    
    const alerts = page.locator('.alert');
    const alertCount = await alerts.count();
    
    expect(alertCount).toBeLessThanOrEqual(55);
  });

  test('should update alert count when alert status changes', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alertsTab = page.locator('button:has-text("Оповещения")');
    await expect(alertsTab).toContainText('Оповещения (1)');
    
    await page.route('**/alerts/alert-1/acknowledge', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({ status: 'ok' }) });
    });

    const alert = page.locator('.alert').nth(0);
    await alert.locator('button:has-text("Прочитано")').click();
    
    await page.waitForTimeout(500);
    
    await expect(alertsTab).toContainText('Оповещения (0)');
  });

  test('should display alert messages correctly', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const alertMessages = page.locator('.alert strong');
    await expect(alertMessages).toHaveCount(3);
    
    await expect(alertMessages.nth(0)).toContainText('Temperature high: 32°C');
    await expect(alertMessages.nth(1)).toContainText('Temperature critical: 40°C');
    await expect(alertMessages.nth(2)).toContainText('Humidity normal: 50%');
  });

  test('should handle API error when loading alerts', async ({ page }) => {
    await page.route('**/alerts', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'internal_error', message: 'Server error' }
        })
      });
    });

    await page.click('button:has-text("Оповещения")');
    
    const errorAlert = page.locator('.alert.critical:has-text("Ошибка загрузки данных")');
    await expect(errorAlert).toBeVisible();
  });

  test('should handle API error when acknowledging alert', async ({ page }) => {
    await page.route('**/alerts/alert-1/acknowledge', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'internal_error', message: 'Failed to acknowledge' }
        })
      });
    });

    await page.click('button:has-text("Оповещения")');
    
    const alert = page.locator('.alert').nth(0);
    await alert.locator('button:has-text("Прочитано")').click();
    
    await page.waitForTimeout(500);
    
    await expect(alert.locator('span:has-text("Новый")')).toBeVisible();
    await expect(alert.locator('button:has-text("Прочитано")')).toBeVisible();
  });

  test('should maintain UI state when switching between tabs', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    await expect(page.locator('h2:has-text("Оповещения")')).toBeVisible();
    
    await page.click('button:has-text("Правила")');
    await expect(page.locator('h2:has-text("Активные правила")')).toBeVisible();
    
    await page.click('button:has-text("Оповещения")');
    await expect(page.locator('h2:has-text("Оповещения")')).toBeVisible();
    
    const alerts = page.locator('.alert');
    await expect(alerts).toHaveCount(3);
  });

  test('should update alerts list in real-time via WebSocket', async ({ page }) => {
    await page.click('button:has-text("Оповещения")');
    
    const initialAlerts = page.locator('.alert');
    const initialCount = await initialAlerts.count();
    
    for (let i = 0; i < 3; i++) {
      await page.evaluate((index) => {
        const socketEvent = new CustomEvent('socket-alert', {
          detail: {
            id: `alert-realtime-${index}`,
            metric_id: 'metric-1',
            reading_id: `reading-realtime-${index}`,
            level: 'warning',
            status: 'new',
            message: `Real-time alert ${index}`,
            created_at: new Date().toISOString()
          }
        });
        window.dispatchEvent(socketEvent);
      }, i);
      
      await page.waitForTimeout(200);
    }
    
    await page.waitForTimeout(500);
    
    const updatedAlerts = page.locator('.alert');
    const updatedCount = await updatedAlerts.count();
    
    expect(updatedCount).toBe(initialCount + 3);
    
    for (let i = 0; i < 3; i++) {
      await expect(updatedAlerts.nth(i)).toContainText(`Real-time alert ${i}`);
    }
  });
});