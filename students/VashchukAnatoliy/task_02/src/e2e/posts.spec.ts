import { test, expect } from '@playwright/test';

test.describe('Posts Management', () => {
  const timestamp = Date.now();
  const testUser = {
    username: `postuser_${timestamp}`,
    email: `postuser_${timestamp}@example.com`,
    password: 'password123',
  };

  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect to feed
    await page.waitForURL(/\/feed/);
  });

  test('should create a new post', async ({ page }) => {
    const postText = `Test post created at ${new Date().toISOString()}`;
    
    // Find and fill post creation form
    const textarea = page.locator('textarea[placeholder*="мысл"]').first();
    await textarea.fill(postText);
    
    // Submit post
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for post to appear
    await expect(page.locator(`text=${postText}`)).toBeVisible();
  });

  test('should display post in feed', async ({ page }) => {
    const postText = `Feed test ${timestamp}`;
    
    // Create post
    await page.fill('textarea', postText);
    await page.locator('button[type="submit"]').first().click();
    
    // Verify post appears in feed
    await expect(page.locator(`text=${postText}`)).toBeVisible();
    await expect(page.locator(`text=${testUser.username}`)).toBeVisible();
  });

  test('should like a post', async ({ page }) => {
    // Create a post first
    await page.fill('textarea', 'Post to like');
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for post
    await page.waitForSelector('text=Post to like');
    
    // Click like button
    const likeButton = page.locator('[data-testid="like-button"]').first();
    await likeButton.click();
    
    // Verify like count increased
    await expect(page.locator('[data-testid="like-count"]').first()).toContainText('1');
  });

  test('should delete own post', async ({ page }) => {
    const postText = `Post to delete ${timestamp}`;
    
    // Create post
    await page.fill('textarea', postText);
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for post
    await page.waitForSelector(`text=${postText}`);
    
    // Open post menu and delete
    await page.locator('[data-testid="post-menu"]').first().click();
    await page.click('text=Удалить');
    
    // Confirm deletion
    await page.click('button:has-text("Да")');
    
    // Verify post is gone
    await expect(page.locator(`text=${postText}`)).not.toBeVisible();
  });

  test('should validate post text length', async ({ page }) => {
    // Try to create post with >280 characters
    const longText = 'a'.repeat(281);
    
    await page.fill('textarea', longText);
    await page.locator('button[type="submit"]').first().click();
    
    // Should show validation error
    await expect(page.locator('text=/280/i')).toBeVisible();
  });

  test('should add a reply to post', async ({ page }) => {
    const postText = `Original post ${timestamp}`;
    const replyText = `Reply to post ${timestamp}`;
    
    // Create original post
    await page.fill('textarea', postText);
    await page.locator('button[type="submit"]').first().click();
    
    // Wait for post
    await page.waitForSelector(`text=${postText}`);
    
    // Click reply button
    await page.locator('[data-testid="reply-button"]').first().click();
    
    // Fill reply
    await page.fill('textarea', replyText);
    await page.click('button[type="submit"]');
    
    // Verify reply appears
    await expect(page.locator(`text=${replyText}`)).toBeVisible();
  });
});
