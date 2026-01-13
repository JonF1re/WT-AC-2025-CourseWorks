import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3000';

test.describe('Devices List E2E Tests', () => {
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

    await page.goto(`${BASE_URL}/admin/devices`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should load devices page with correct title', async () => {
    await expect(page.locator('h1')).toHaveText('Управление устройствами');
    await expect(page.locator('p')).toContainText('Создавайте и управляйте устройствами системы мониторинга');
  });

  test('should display device creation form', async () => {
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    await expect(page.locator('label[for="device-name"]')).toContainText('Название устройства *');
    await expect(page.locator('label[for="device-owner"]')).toContainText('Владелец устройства *');
    await expect(page.locator('label[for="device-description"]')).toContainText('Описание (необязательно)');
    
    const nameInput = page.locator('#device-name');
    const ownerSelect = page.locator('#device-owner');
    const descriptionInput = page.locator('#device-description');
    
    await expect(nameInput).toBeVisible();
    await expect(ownerSelect).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toContainText('Создать устройство');
  });

  test('should load and display users in owner dropdown', async () => {
    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'user-1', username: 'alice', role: 'user' },
            { id: 'user-2', username: 'bob', role: 'user' },
            { id: 'admin-uuid', username: 'admin', role: 'admin' }
          ],
          total: 3,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/users`);

    const ownerSelect = page.locator('#device-owner');
    await ownerSelect.click();
    
    const options = ownerSelect.locator('option');
    await expect(options).toHaveCount(4);
    await expect(options.nth(1)).toContainText('alice (Пользователь)');
    await expect(options.nth(2)).toContainText('bob (Пользователь)');
    await expect(options.nth(3)).toContainText('admin (Администратор)');
  });

  test('should create new device successfully', async () => {
    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'user-1', username: 'testuser', role: 'user' }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/devices`, async route => {
      const request = route.request();
      const postData = JSON.parse(await request.postData() || '{}');
      
      if (postData.name === 'New Test Device') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: {
              id: 'new-device-id',
              name: 'New Test Device',
              description: 'Test description',
              owner_id: 'user-1'
            }
          })
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'error',
            error: { code: 'validation_failed', message: 'Invalid data' }
          })
        });
      }
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/users`);

    await page.fill('#device-name', 'New Test Device');
    await page.selectOption('#device-owner', 'user-1');
    await page.fill('#device-description', 'Test description');
    
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{
            id: 'new-device-id',
            name: 'New Test Device',
            description: 'Test description',
            owner_id: 'user-1'
          }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.click('button[type="submit"]');
    await page.waitForResponse(`${API_URL}/devices`);
    
    const tableRows = page.locator('tbody tr');
    await expect(tableRows).toHaveCount(1);
    await expect(tableRows.locator('td').nth(0)).toContainText('New Test Device');
    await expect(tableRows.locator('td').nth(1)).toContainText('Test description');
  });

  test('should show validation error when creating device without name', async () => {
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Название устройства обязательно');
    
    const nameInput = page.locator('#device-name');
    await expect(nameInput).toBeFocused();
  });

  test('should show validation error when creating device without owner', async () => {
    await page.fill('#device-name', 'Device without owner');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Выберите владельца устройства');
  });

  test('should load and display devices in table', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Smart Thermometer', description: 'Temperature sensor', owner_id: 'user-1' },
            { id: 'device-2', name: 'Humidity Meter', description: 'Humidity monitoring device', owner_id: 'user-2' },
            { id: 'device-3', name: 'Light Switch', description: '', owner_id: 'admin-uuid' }
          ],
          total: 3,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'user-1', username: 'alice', role: 'user' },
            { id: 'user-2', username: 'bob', role: 'user' },
            { id: 'admin-uuid', username: 'admin', role: 'admin' }
          ],
          total: 3,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);

    const table = page.locator('table');
    await expect(table).toBeVisible();
    
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    
    await expect(rows.nth(0).locator('td').nth(0)).toContainText('Smart Thermometer');
    await expect(rows.nth(0).locator('td').nth(1)).toContainText('Temperature sensor');
    await expect(rows.nth(0).locator('td').nth(2)).toContainText('alice');
    
    await expect(rows.nth(2).locator('td').nth(0)).toContainText('Light Switch');
    await expect(rows.nth(2).locator('td').nth(1)).toContainText('Нет описания');
    await expect(rows.nth(2).locator('td').nth(2)).toContainText('admin');
  });

  test('should edit existing device', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Old Device Name', description: 'Old description', owner_id: 'user-1' }
          ],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'user-1', username: 'alice', role: 'user' },
            { id: 'user-2', username: 'bob', role: 'user' }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);

    const editButton = page.locator('button:has-text("Редакт.")').first();
    await editButton.click();
    
    await expect(page.locator('h2')).toContainText('Редактирование устройства');
    await expect(page.locator('#device-name')).toHaveValue('Old Device Name');
    await expect(page.locator('#device-description')).toHaveValue('Old description');
    await expect(page.locator('#device-owner')).toHaveValue('user-1');
    
    await page.fill('#device-name', 'Updated Device Name');
    await page.fill('#device-description', 'Updated description');
    await page.selectOption('#device-owner', 'user-2');
    
    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'device-1',
            name: 'Updated Device Name',
            description: 'Updated description',
            owner_id: 'user-2'
          }
        })
      });
    });

    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Updated Device Name', description: 'Updated description', owner_id: 'user-2' }
          ],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.click('button[type="submit"]');
    await page.waitForResponse(`${API_URL}/devices/device-1`);
    
    await expect(page.locator('h2')).toContainText('Добавить новое устройство');
    await expect(page.locator('tbody tr td').first()).toContainText('Updated Device Name');
  });

  test('should cancel device editing', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Test Device', description: 'Test', owner_id: 'user-1' }
          ],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);

    const editButton = page.locator('button:has-text("Редакт.")').first();
    await editButton.click();
    
    await page.fill('#device-name', 'Changed Name');
    await page.click('button:has-text("Отменить")');
    
    await expect(page.locator('h2')).toContainText('Добавить новое устройство');
    await expect(page.locator('#device-name')).toHaveValue('');
    await expect(page.locator('#device-owner')).toHaveValue('');
  });

  test('should delete device with confirmation', async () => {
    const dialogPromise = page.waitForEvent('dialog');
    
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Device to delete', description: 'Will be deleted', owner_id: 'user-1' }
          ],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/devices/device-1`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);

    const deleteButton = page.locator('button:has-text("Удалить")').first();
    deleteButton.click();
    
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain('Вы уверены, что хотите удалить устройство "Device to delete"?');
    
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

    await dialog.accept();
    await page.waitForResponse(`${API_URL}/devices/device-1`);
    await page.waitForResponse(`${API_URL}/devices`);
    
    await expect(page.locator('tbody tr')).toHaveCount(0);
    await expect(page.locator('div:has-text("Устройства не найдены")')).toBeVisible();
  });

  test('should not delete device when canceling confirmation', async () => {
    const dialogPromise = page.waitForEvent('dialog');
    
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Device to keep', description: 'Should not be deleted', owner_id: 'user-1' }
          ],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);

    const deleteButton = page.locator('button:has-text("Удалить")').first();
    deleteButton.click();
    
    const dialog = await dialogPromise;
    await dialog.dismiss();
    
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr td').first()).toContainText('Device to keep');
  });

  test('should display error message when API fails to load devices', async () => {
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
    await page.waitForResponse(`${API_URL}/devices`);
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Не удалось загрузить устройства');
  });

  test('should display error message when API fails to create device', async () => {
    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'user-1', username: 'test', role: 'user' }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'error',
          error: { code: 'validation_failed', message: 'Invalid device data' }
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/users`);

    await page.fill('#device-name', 'Invalid Device');
    await page.selectOption('#device-owner', 'user-1');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    await expect(page.locator('.alert.critical')).toContainText('Ошибка при создании устройства');
  });

  test('should refresh devices list', async () => {
    let callCount = 0;
    
    await page.route(`${API_URL}/devices`, async route => {
      callCount++;
      if (callCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: [
              { id: 'device-1', name: 'First Load', description: '', owner_id: 'user-1' }
            ],
            total: 1,
            page: 1,
            limit: 10
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'ok',
            data: [
              { id: 'device-1', name: 'First Load', description: '', owner_id: 'user-1' },
              { id: 'device-2', name: 'After Refresh', description: 'New device', owner_id: 'user-2' }
            ],
            total: 2,
            page: 1,
            limit: 10
          })
        });
      }
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);
    
    let rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(1);
    
    await page.click('button:has-text("Обновить")');
    await page.waitForResponse(`${API_URL}/devices`);
    
    rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1).locator('td').first()).toContainText('After Refresh');
  });

  test('should show loading state during form submission', async () => {
    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [{ id: 'user-1', username: 'test', role: 'user' }],
          total: 1,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/devices`, async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: {
            id: 'new-device',
            name: 'Test Device',
            description: '',
            owner_id: 'user-1'
          }
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/users`);

    await page.fill('#device-name', 'Test Device');
    await page.selectOption('#device-owner', 'user-1');
    
    const submitPromise = page.click('button[type="submit"]');
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toHaveAttribute('aria-busy', 'true');
    await expect(submitButton.locator('div')).toBeVisible();
    
    await submitPromise;
    
    await expect(submitButton).not.toHaveAttribute('aria-busy', 'true');
  });

  test('should clear error message when close button is clicked', async () => {
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
    await page.waitForResponse(`${API_URL}/devices`);
    
    await expect(page.locator('.alert.critical')).toBeVisible();
    
    await page.click('.alert.critical button[aria-label="Закрыть сообщение об ошибке"]');
    
    await expect(page.locator('.alert.critical')).not.toBeVisible();
  });

  test('should display owner role badges correctly', async () => {
    await page.route(`${API_URL}/devices`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'device-1', name: 'Device 1', description: '', owner_id: 'user-1' },
            { id: 'device-2', name: 'Device 2', description: '', owner_id: 'admin-uuid' }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.route(`${API_URL}/users`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          data: [
            { id: 'user-1', username: 'alice', role: 'user' },
            { id: 'admin-uuid', username: 'admin', role: 'admin' }
          ],
          total: 2,
          page: 1,
          limit: 10
        })
      });
    });

    await page.reload();
    await page.waitForResponse(`${API_URL}/devices`);

    const rows = page.locator('tbody tr');
    
    const userBadge = rows.nth(0).locator('span:has-text("Пользователь")');
    const adminBadge = rows.nth(1).locator('span:has-text("Администратор")');
    
    await expect(userBadge).toBeVisible();
    await expect(adminBadge).toBeVisible();
    
    await expect(userBadge).toHaveCSS('background-color', 'rgba(156, 163, 175, 0.2)');
    await expect(adminBadge).toHaveCSS('background-color', 'rgba(59, 130, 246, 0.2)');
  });
});