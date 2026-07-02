import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toContainText('CryptoViz')
    await expect(page.getByText('Interact with Cryptography')).toBeVisible()
  })

  test('should show 4 category cards', async ({ page }) => {
    await page.goto('/')
    const cards = page.locator('h3')
    await expect(cards.first()).toBeVisible()
    await expect(page.getByText('Classical Ciphers')).toBeVisible()
    await expect(page.getByText('Symmetric Cryptosystems')).toBeVisible()
    await expect(page.getByText('Secure Hash Functions')).toBeVisible()
    await expect(page.getByText('Asymmetric Cryptography')).toBeVisible()
  })

  test('should navigate to Playground on button click', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Open Interactive Playground').click()
    await expect(page).toHaveURL(/\/visualizer\/caesar/)
  })

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const initial = await html.getAttribute('class')
    await page.getByLabel('Toggle theme').click()
    const after = await html.getAttribute('class')
    expect(initial).not.toBe(after)
  })
})

test.describe('Navigation', () => {
  test('should navigate between all nav links', async ({ page }) => {
    await page.goto('/')
    await page.getByText('Playground').click()
    await expect(page).toHaveURL(/\/visualizer\/caesar/)

    await page.getByText('Docs').click()
    await expect(page).toHaveURL(/\/docs/)

    await page.getByText('Resources').click()
    await expect(page).toHaveURL(/\/resources/)
  })
})
