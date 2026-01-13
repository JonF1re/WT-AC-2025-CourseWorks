import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('Device Detail E2E Tests', () => {
  let page: Page;
  let adminToken: string;
  let userId: string;
  let deviceId: string;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });

    adminToken = 'mock-jwt-token-admin';
    userId = 'admin-uuid';
    deviceId = 'device-1';

  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate to device detail from devices list', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Smart Thermometer', description: 'Temperature sensor', owner_id: userId },
            { id: 'device-2', name: 'Humidity Meter', description: 'Humidity sensor', owner_id: userId }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.goto(`${BASE_URL}/admin/devices`);
    await page.waitForLoadState('networkidle');

    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Smart Thermometer',
            description: 'Temperature sensor',
            location: 'Living Room',
            type: 'sensor',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' },
              { id: 'metric-2', name: 'Humidity', unit: '%', device_id: 'device-1' }
            ]
          }
        })
      });
    });

    await page.click(`tr:has-text("Smart Thermometer") button:has-text("Редакт.")`);
    
    await expect(page.locator('h2')).toContainText('Редактирование устройства');
    await expect(page.locator('#device-name')).toHaveValue('Smart Thermometer');
    await expect(page.locator('#device-description')).toHaveValue('Temperature sensor');
  });

  test('should display detailed device information', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Smart Thermometer Pro',
            description: 'Advanced temperature monitoring device with wireless connectivity',
            location: 'Living Room - North Wall',
            type: 'wireless_sensor',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' },
              { id: 'metric-2', name: 'Battery Level', unit: '%', device_id: 'device-1' },
              { id: 'metric-3', name: 'Signal Strength', unit: 'dBm', device_id: 'device-1' }
            ]
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Smart Thermometer Pro');
    
    await expect(page.locator('div:has-text("Локация") + div')).toContainText('Living Room - North Wall');
    await expect(page.locator('div:has-text("Тип") + div')).toContainText('wireless_sensor');
    await expect(page.locator('div:has-text("Описание") + div')).toContainText('Advanced temperature monitoring device');
  });

  test('should display device metrics in detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'CPU Usage', unit: '%', device_id: 'device-1' },
              { id: 'metric-2', name: 'Memory Usage', unit: 'MB', device_id: 'device-1' },
              { id: 'metric-3', name: 'Disk Space', unit: 'GB', device_id: 'device-1' }
            ]
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const metricsSection = page.locator('h2:has-text("Метрики устройства")');
    await expect(metricsSection).toBeVisible();

    const metricsTable = page.locator('table');
    const rows = metricsTable.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    
    await expect(rows.nth(0).locator('td').nth(0)).toContainText('CPU Usage');
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('%');
    await expect(rows.nth(1).locator('td').nth(0)).toContainText('Memory Usage');
    await expect(rows.nth(1).locator('td').nth(1)).toContainText('MB');
    await expect(rows.nth(2).locator('td').nth(0)).toContainText('Disk Space');
    await expect(rows.nth(2).locator('td').nth(1)).toContainText('GB');
  });

  test('should display device readings in detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' }
            ]
          }
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
            { id: 'reading-2', metric_id: 'metric-1', timestamp: '2023-12-17T10:05:00Z', value: 22.8 },
            { id: 'reading-3', metric_id: 'metric-1', timestamp: '2023-12-17T10:10:00Z', value: 23.1 }
          ],
          total: 3,
          page: 1,
          limit: 10
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const readingsSection = page.locator('h2:has-text("Последние показания")');
    await expect(readingsSection).toBeVisible();

    const readingsTable = page.locator('table').nth(1);
    const rows = readingsTable.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    
    await expect(rows.nth(0).locator('td').nth(0)).toContainText('22.5');
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('°C');
    await expect(rows.nth(0).locator('td').nth(2)).toContainText('2023');
  });

  test('should display device alerts in detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' }
            ]
          }
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
              message: 'Temperature critical: 45°C',
              created_at: '2023-12-17T10:00:00Z',
              reading: { id: 'reading-1', metric_id: 'metric-1', timestamp: '2023-12-17T10:00:00Z', value: 45.0 },
              metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
            },
            {
              id: 'alert-2',
              metric_id: 'metric-1',
              reading_id: 'reading-2',
              level: 'warning',
              status: 'acknowledged',
              message: 'Temperature warning: 35°C',
              created_at: '2023-12-17T09:30:00Z',
              reading: { id: 'reading-2', metric_id: 'metric-1', timestamp: '2023-12-17T09:30:00Z', value: 35.0 },
              metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
            }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const alertsSection = page.locator('h2:has-text("Оповещения устройства")');
    await expect(alertsSection).toBeVisible();

    const alertsTable = page.locator('table').nth(2);
    const rows = alertsTable.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    
    await expect(rows.nth(0).locator('td').nth(0)).toContainText('Temperature');
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('critical');
    await expect(rows.nth(0).locator('td').nth(2)).toContainText('Temperature critical: 45°C');
    await expect(rows.nth(0).locator('td').nth(3)).toContainText('Новый');
  });

  test('should acknowledge alert from device detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' }
            ]
          }
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
              message: 'Temperature critical',
              created_at: '2023-12-17T10:00:00Z',
              metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
            }
          ],
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

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const acknowledgeButton = page.locator('button:has-text("Прочитано")');
    await expect(acknowledgeButton).toBeVisible();

    await acknowledgeButton.click();
    await page.waitForResponse(`${API_URL}/alerts/alert-1/ack`);

    const statusCell = page.locator('tbody tr td').nth(3);
    await expect(statusCell).toContainText('Подтверждён');
  });

  test('should close alert from device detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: [
              { id: 'metric-1', name: 'Temperature', unit: '°C', device_id: 'device-1' }
            ]
          }
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
              status: 'acknowledged',
              message: 'Temperature critical',
              created_at: '2023-12-17T10:00:00Z',
              metric: { id: 'metric-1', name: 'Temperature', unit: '°C', device: { id: 'device-1', name: 'Test Device' } }
            }
          ],
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

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const closeButton = page.locator('button:has-text("Закрыть")');
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await page.waitForResponse(`${API_URL}/alerts/alert-1/close`);

    const statusCell = page.locator('tbody tr td').nth(3);
    await expect(statusCell).toContainText('Закрыт');
  });

  test('should display device health status', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Server Rack',
            description: 'Main server rack',
            owner_id: userId,
            metrics: [],
            health_status: 'healthy',
            last_seen: '2023-12-17T10:00:00Z',
            uptime: 86400
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const healthStatus = page.locator('span:has-text("healthy")');
    await expect(healthStatus).toBeVisible();
    
    await expect(page.locator('div:has-text("Последняя активность") + div')).toContainText('2023');
    await expect(page.locator('div:has-text("Аптайм") + div')).toContainText('1 день');
  });

  test('should display no metrics message when device has no metrics', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'New Device',
            description: 'Recently added device',
            owner_id: userId,
            metrics: []
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('div:has-text("Нет метрик для этого устройства")')).toBeVisible();
  });

  test('should display no alerts message when device has no alerts', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: [{ id: 'metric-1', name: 'Test', unit: 'U', device_id: 'device-1' }]
          }
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

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('div:has-text("Нет оповещений для этого устройства")')).toBeVisible();
  });

  test('should display error when device not found', async () => {
    await page.route(`${API_URL}/devices/nonexistent`, async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'not_found', message: 'Device not found' }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/nonexistent`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Устройство не найдено');
  });

  test('should export device data from detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Export Test Device',
            description: 'For export testing',
            owner_id: userId,
            metrics: []
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Экспорт данных")');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('device_device-1_export.csv');
  });

  test('should display loading state while fetching device data', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Slow Device',
            description: 'Slow loading device',
            owner_id: userId,
            metrics: []
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);

    const loadingIndicator = page.locator('div:has-text("Загрузка устройства...")');
    await expect(loadingIndicator).toBeVisible();

    await page.waitForLoadState('networkidle');
    await expect(loadingIndicator).not.toBeVisible();
  });

  test('should navigate back to devices list', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Test Device',
            description: 'Test',
            owner_id: userId,
            metrics: []
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const backButton = page.locator('button:has-text("Назад к списку")');
    await expect(backButton).toBeVisible();

    await backButton.click();
    await page.waitForURL(`${BASE_URL}/admin/devices`);
    await expect(page).toHaveURL(`${BASE_URL}/admin/devices`);
  });

  test('should update device from detail view', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Old Device Name',
            description: 'Old description',
            location: 'Old Location',
            type: 'old_type',
            owner_id: userId,
            metrics: []
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("Редактировать")');
    
    await page.fill('input[name="name"]', 'Updated Device Name');
    await page.fill('input[name="description"]', 'Updated description');
    await page.fill('input[name="location"]', 'Updated Location');
    
    await page.route(`${API_URL}/devices/device-1`, async route => {
      const request = route.request();
      const postData = JSON.parse(await request.postData() || '{}');
      
      if (postData.name === 'Updated Device Name') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              id: 'device-1',
              name: 'Updated Device Name',
              description: 'Updated description',
              location: 'Updated Location',
              type: 'old_type',
              owner_id: userId
            }
          })
        });
      }
    });

    await page.click('button:has-text("Сохранить")');
    await page.waitForResponse(`${API_URL}/devices/device-1`);
    
    await expect(page.locator('h1')).toContainText('Updated Device Name');
    await expect(page.locator('div:has-text("Локация") + div')).toContainText('Updated Location');
  });

  test('should display device activity timeline', async () => {
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Active Device',
            description: 'Device with activity',
            owner_id: userId,
            metrics: [],
            activity: [
              { timestamp: '2023-12-17T10:00:00Z', event: 'Device online', type: 'status' },
              { timestamp: '2023-12-17T09:45:00Z', event: 'Configuration updated', type: 'config' },
              { timestamp: '2023-12-17T09:30:00Z', event: 'Alert triggered', type: 'alert' }
            ]
          }
        })
      });
    });

    await page.goto(`${BASE_URL}/device/${deviceId}`);
    await page.waitForLoadState('networkidle');

    const timelineSection = page.locator('h2:has-text("Активность устройства")');
    await expect(timelineSection).toBeVisible();

    const timelineItems = page.locator('.timeline-item');
    await expect(timelineItems).toHaveCount(3);
    
    await expect(timelineItems.nth(0)).toContainText('Device online');
    await expect(timelineItems.nth(1)).toContainText('Configuration updated');
    await expect(timelineItems.nth(2)).toContainText('Alert triggered');
  });
});