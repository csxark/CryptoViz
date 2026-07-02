import { test, expect } from '@playwright/test'

test.describe('Docs Page', () => {
  test('should list all docs', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.locator('h1')).toContainText('Documentation')
    await expect(page.getByText('Introduction to Cryptography')).toBeVisible()
    await expect(page.getByText('Symmetric vs Asymmetric')).toBeVisible()
    await expect(page.getByText('Common Cryptographic Attacks')).toBeVisible()
  })

  test('should open a doc detail view', async ({ page }) => {
    await page.goto('/docs')
    await page.getByText('Introduction to Cryptography').click()
    await expect(page.getByText('What is Cryptography?')).toBeVisible()
    await expect(page.getByText('Back to docs')).toBeVisible()
  })
})

test.describe('Resources Page', () => {
  test('should display resources with filters', async ({ page }) => {
    await page.goto('/resources')
    await expect(page.locator('h1')).toContainText('Learning Resources')
    await expect(page.getByPlaceholder('Search resources...')).toBeVisible()
    await expect(page.getByText('The Code Book')).toBeVisible()
  })

  test('should filter by type', async ({ page }) => {
    await page.goto('/resources')
    await page.getByText('book', { exact: true }).click()
    await expect(page.getByText('The Code Book')).toBeVisible()
  })

  test('should search resources', async ({ page }) => {
    await page.goto('/resources')
    await page.getByPlaceholder('Search resources...').fill('AES')
    await expect(page.getByText('Showing')).toBeVisible()
  })
})
