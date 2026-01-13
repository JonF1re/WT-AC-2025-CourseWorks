import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('Dashboard E2E Tests', () => {
  let page: Page;
  let adminToken: string;
  let userId: string;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });

    adminToken = 'mock-jwt-token-admin';
    userId = 'admin-uuid';

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load dashboard with correct title and user info', async () => {
    await expect(page.locator('h1')).toHaveText('Панель управления');
    await expect(page.locator('header')).toContainText('Пользователь: admin');
    await expect(page.locator('span:has-text("Администратор")')).toBeVisible();
  });

  test('should display logout button', async () => {
    const logoutButton = page.locator('button:has-text("Выйти")');
    await expect(logoutButton).toBeVisible();
    await expect(logoutButton).toHaveAttribute('aria-label', 'Выйти из системы');
  });

  test('should load and display devices list', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Smart Thermometer', description: 'Temperature sensor', location: 'Living Room', owner_id: userId },
            { id: 'device-2', name: 'Humidity Meter', description: 'Humidity sensor', location: 'Kitchen', owner_id: userId }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const deviceSelect = page.locator('select#device-select');
    await expect(deviceSelect).toBeVisible();
    await expect(deviceSelect.locator('option')).toHaveCount(3); // 2 devices + default option
    await expect(deviceSelect.locator('option:nth-child(2)')).toContainText('Smart Thermometer');
  });

  test('should load metrics when device is selected', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/metrics?device_id=device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' },
            { id: 'metric-2', name: 'Humidity', unit: '%', device_id: 'device-1' }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/metrics?device_id=device-1`);

    const metricSelect = page.locator('select#metric-select');
    await expect(metricSelect).toBeVisible();
    await expect(metricSelect.locator('option')).toHaveCount(3); // 2 metrics + default option
  });

  test('should display device details when device is selected', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{
            id: 'device-1',
            name: 'Smart Thermometer',
            description: 'Temperature sensor',
            location: 'Living Room',
            owner_id: userId
          }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/dashboards/home/${userId}/metrics-summary`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: { devices: 5, metrics: 12, openAlerts: 3 }
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/dashboards/home/${userId}/metrics-summary`);

    await expect(page.locator('div:has-text("Название") + div')).toContainText('Smart Thermometer');
    await expect(page.locator('div:has-text("Локация") + div')).toContainText('Living Room');
    await expect(page.locator('div:has-text("Описание") + div')).toContainText('Temperature sensor');
    await expect(page.locator('div:has-text("Устройств в доме") + div')).toContainText('5');
    await expect(page.locator('div:has-text("Всего метрик") + div')).toContainText('12');
    await expect(page.locator('div:has-text("Открытых алертов") + div')).toContainText('3');
  });

  test('should load and display readings chart', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/metrics?device_id=device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/metrics/metric-1/readings`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'reading-1', metric_id: 'metric-1', timestamp: '2023-12-17T10:00:00Z', value: 22.5 },
            { id: 'reading-2', metric_id: 'metric-1', timestamp: '2023-12-17T10:05:00Z', value: 23.1 },
            { id: 'reading-3', metric_id: 'metric-1', timestamp: '2023-12-17T10:10:00Z', value: 22.8 }
          ],
          total: 3,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.selectOption('select#metric-select', 'metric-1');
    await page.waitForResponse(`${API_URL}/metrics/metric-1/readings`);

    const chart = page.locator('canvas');
    await expect(chart).toBeVisible();
  });

  test('should load and display alerts table', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts?device_id=device-1`, async route => {
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
              level: 'critical',
              status: 'new',
              message: 'Temperature too high',
              created_at: '2023-12-17T10:00:00Z',
              reading: { id: 'reading-1', metric_id: 'metric-1', timestamp: '2023-12-17T10:00:00Z', value: 32.5 },
              metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
            },
            {
              id: 'alert-2',
              metric_id: 'metric-2',
              reading_id: 'reading-2',
              level: 'warning',
              status: 'acknowledged',
              message: 'Humidity high',
              created_at: '2023-12-17T09:00:00Z',
              reading: { id: 'reading-2', metric_id: 'metric-2', timestamp: '2023-12-17T09:00:00Z', value: 85 },
              metric: { id: 'metric-2', name: 'Humidity', unit: '%', device: { id: 'device-1', name: 'Test Device' } }
            }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/alerts?device_id=device-1`);

    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    
    await expect(rows.nth(0).locator('td').nth(0)).toContainText('Temperature');
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('critical');
    await expect(rows.nth(0).locator('td').nth(2)).toContainText('Temperature too high');
    await expect(rows.nth(0).locator('td').nth(3)).toContainText('Новый');
    
    await expect(rows.nth(1).locator('td').nth(0)).toContainText('Humidity');
    await expect(rows.nth(1).locator('td').nth(1)).toContainText('warning');
    await expect(rows.nth(1).locator('td').nth(2)).toContainText('Humidity high');
    await expect(rows.nth(1).locator('td').nth(3)).toContainText('Подтверждён');
  });

  test('should acknowledge alert', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts?device_id=device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{
            id: 'alert-1',
            metric_id: 'metric-1',
            reading_id: 'reading-1',
            level: 'critical',
            status: 'new',
            message: 'Temperature too high',
            created_at: '2023-12-17T10:00:00Z',
            reading: { id: 'reading-1', metric_id: 'metric-1', timestamp: '2023-12-17T10:00:00Z', value: 32.5 },
            metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
          }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts/alert-1/ack`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/alerts?device_id=device-1`);

    const acknowledgeButton = page.locator('button:has-text("Прочитано")');
    await expect(acknowledgeButton).toBeVisible();

    await acknowledgeButton.click();
    await page.waitForResponse(`${API_URL}/alerts/alert-1/ack`);

    const statusCell = page.locator('tbody tr td').nth(3);
    await expect(statusCell).toContainText('Подтверждён');
  });

  test('should close alert', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts?device_id=device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{
            id: 'alert-1',
            metric_id: 'metric-1',
            reading_id: 'reading-1',
            level: 'critical',
            status: 'acknowledged',
            message: 'Temperature too high',
            created_at: '2023-12-17T10:00:00Z',
            reading: { id: 'reading-1', metric_id: 'metric-1', timestamp: '2023-12-17T10:00:00Z', value: 32.5 },
            metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
          }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts/alert-1/close`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/alerts?device_id=device-1`);

    const closeButton = page.locator('button:has-text("Закрыть")');
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await page.waitForResponse(`${API_URL}/alerts/alert-1/close`);

    const statusCell = page.locator('tbody tr td').nth(3);
    await expect(statusCell).toContainText('Закрыт');
  });

  test('should export device data as CSV', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Экспорт устройства")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('device_device-1.csv');
  });

  test('should export readings as CSV', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/metrics?device_id=device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/metrics/metric-1/readings`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'reading-1', metric_id: 'metric-1', timestamp: '2023-12-17T10:00:00Z', value: 22.5 }
          ],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.selectOption('select#metric-select', 'metric-1');
    await page.waitForResponse(`${API_URL}/metrics/metric-1/readings`);

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Экспорт показаний")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('readings_metric-1.csv');
  });

  test('should export alerts as CSV', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts?device_id=device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{
            id: 'alert-1',
            metric_id: 'metric-1',
            reading_id: 'reading-1',
            level: 'critical',
            status: 'new',
            message: 'Temperature too high',
            created_at: '2023-12-17T10:00:00Z'
          }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/alerts?device_id=device-1`);

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Экспорт алертов")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('alerts_device-1.csv');
  });

  test('should display error message when API fails', async () => {
    await page.route(`${API_URL}/devices`, async route => {
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
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Ошибка загрузки устройств');
  });

  test('should display loading states', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    const deviceSelect = page.locator('select#device-select');
    await expect(deviceSelect).toBeDisabled();
  });

  test('should handle no devices state', async () => {
    await page.route(`${API_URL}/devices`, async route => {
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
    await page.waitForLoadState('networkidle');

    const deviceSelect = page.locator('select#device-select');
    await expect(deviceSelect).toBeVisible();
    await expect(deviceSelect.locator('option')).toHaveCount(1);
    await expect(deviceSelect.locator('option')).toContainText('-- Выберите устройство --');
  });

  test('should handle no alerts state', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'device-1', name: 'Test Device', owner_id: userId }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/alerts?device_id=device-1`, async route => {
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
    await page.waitForLoadState('networkidle');

    await page.selectOption('select#device-select', 'device-1');
    await page.waitForResponse(`${API_URL}/alerts?device_id=device-1`);

    await expect(page.locator('div:has-text("Нет оповещений для этого устройства")')).toBeVisible();
  });
});