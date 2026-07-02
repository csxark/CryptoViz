import { test, expect } from '@playwright/test'

test.describe('Cipher Visualizer', () => {
  test('should load Caesar cipher by default', async ({ page }) => {
    await page.goto('/visualizer/caesar/')
    await expect(page.locator('h1')).toContainText('Caesar Cipher')
    await expect(page.getByText('Run Computation')).toBeVisible()
  })

  test('should compute output with default values', async ({ page }) => {
    await page.goto('/visualizer/caesar/')
    await page.getByText('Run Computation').click()
    await expect(page.locator('text=KHOOR')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate between ciphers via sidebar', async ({ page }) => {
    await page.goto('/visualizer/caesar/')
    await page.getByText('AES').click()
    await expect(page).toHaveURL(/\/visualizer\/aes/)
    await expect(page.locator('h1')).toContainText('AES')
  })

  test('should show step-by-step trace', async ({ page }) => {
    await page.goto('/visualizer/caesar/')
    await page.getByText('Run Computation').click()
    await expect(page.getByText('Step-by-Step')).toBeVisible({ timeout: 10000 })
  })
})
