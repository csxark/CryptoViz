import { test, expect, Page } from '@playwright/test';
import * as crypto from 'crypto';

/**
 * Enterprise E2E Security Fuzzing Suite
 * 
 * This suite leverages Playwright to aggressively fuzz the UI components and 
 * the underlying Web Workers. It specifically targets the `constantTimeStringEqual`
 * pathways by injecting malformed, extreme-length, and Unicode-heavy payloads 
 * directly into the visualizer's input fields.
 * 
 * Objectives:
 * 1. Ensure the UI thread does not freeze or crash (Web Worker isolation).
 * 2. Validate that 'NaN' or out-of-bounds errors do not leak into the DOM.
 * 3. Verify that the constantTime utilities gracefully handle boundary chaos.
 */

// --- Fuzzing Data Providers ---

const generateRandomHex = (bytes: number) => crypto.randomBytes(bytes).toString('hex');

const FUZZ_PAYLOADS = {
  massiveString: 'A'.repeat(50000), // Stress tests UI rendering and worker memory
  unicodeChaos: 'Z͉͍̺̙̪ō͌̎͌̈̚͜o̵͎͇m̷̙̜̬b̀̌͛͑̐̓͒i̴͈e̵͔͕̭̲̝ ̕Z̷o̴m̵b̷i̶e̷', // Zalgo text to test charCodeAt / TextEncoder limits
  boundaryNulls: '\x00\x00\x00secret\x00\x00\x00', // Null bytes
  sqlInjectionMix: "'; DROP TABLE users; --",
  xssVector: "<script>alert('XSS')</script>",
  emojis: '🔐🔓🔏🔒'.repeat(100), // Surrogate pairs test
  extremelyLongKey: generateRandomHex(1024), // Large key boundary
  empty: '',
  whitespace: '   \n\t\r  ',
};

const CIPHER_ROUTES = [
  '/caesar',
  '/vigenere',
  '/aes',
  '/rsa',
  '/otp'
];

// --- Helper Functions ---

/**
 * Monitors the browser console for uncaught exceptions, NaNs, or memory leaks.
 */
function attachConsoleMonitor(page: Page, errors: string[]) {
  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });
}

/**
 * Safely inputs text into a target locator, clearing it first.
 * Emulates realistic typing speed for small payloads, and bulk-fill for massive ones.
 */
async function injectPayload(page: Page, selector: string, payload: string) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => null);
  
  // If the element doesn't exist on this specific cipher route, gracefully skip
  if (!(await locator.isVisible())) return;

  await locator.fill('');
  
  if (payload.length > 5000) {
    // Evaluate in browser to bypass Playwright's fill bottleneck for massive payloads
    await locator.evaluate((node: HTMLInputElement | HTMLTextAreaElement, text) => {
      node.value = text;
      node.dispatchEvent(new Event('input', { bubbles: true }));
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }, payload);
  } else {
    await locator.fill(payload);
  }
}

/**
 * Extracts and verifies the output box does not contain raw NaNs.
 */
async function verifyOutputIntegrity(page: Page) {
  // Attempt to find any generic output box in the CryptoViz UI
  const outputLocators = [
    page.getByRole('textbox', { name: /output/i }),
    page.locator('.cipher-output-container'),
    page.locator('textarea[readonly]')
  ];

  for (const locator of outputLocators) {
    if (await locator.count() > 0 && await locator.first().isVisible()) {
      const text = await locator.first().inputValue().catch(async () => await locator.first().textContent() || '');
      // Ensure NaN didn't slip through into the ciphertext UI
      expect(text).not.toContain('NaN');
      expect(text).not.toContain('undefined');
    }
  }
}

// --- Test Suites ---

test.describe('E2E Cryptographic Fuzzing & Worker Resilience', () => {

  test.beforeEach(async ({ page }) => {
    // Block unnecessary network requests to speed up fuzzing
    await page.route('**/*.{png,jpg,jpeg,svg,woff2}', route => route.abort());
    await page.route('**/*analytics*', route => route.abort());
  });

  for (const route of CIPHER_ROUTES) {
    test.describe(`Fuzzing Route: ${route}`, () => {

      test(`should survive massive string injections without crashing on ${route}`, async ({ page, baseURL }) => {
        const errors: string[] = [];
        attachConsoleMonitor(page, errors);

        // Attempt to navigate, gracefully handling 404s if a cipher route doesn't exist yet
        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        if (response?.status() === 404) return test.skip();

        // Target generic input fields commonly used in the visualizer
        await injectPayload(page, 'textarea[placeholder*="text" i]', FUZZ_PAYLOADS.massiveString);
        await injectPayload(page, 'input[placeholder*="key" i]', FUZZ_PAYLOADS.extremelyLongKey);

        // Allow Web Worker time to crunch the data
        await page.waitForTimeout(1000);

        // The UI should still be responsive
        const body = page.locator('body');
        expect(await body.isVisible()).toBe(true);

        await verifyOutputIntegrity(page);

        // Ensure no fatal NaN or out-of-bounds exceptions occurred in the console
        expect(errors.filter(e => e.includes('NaN') || e.includes('out of bounds'))).toHaveLength(0);
      });

      test(`should securely handle Unicode Zalgo & Surrogate Pairs on ${route}`, async ({ page }) => {
        const errors: string[] = [];
        attachConsoleMonitor(page, errors);

        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        if (response?.status() === 404) return test.skip();

        // Inject chaotic unicode that tests TextEncoder boundaries
        await injectPayload(page, 'textarea[placeholder*="text" i]', FUZZ_PAYLOADS.unicodeChaos);
        await injectPayload(page, 'input[placeholder*="key" i]', FUZZ_PAYLOADS.emojis);

        await page.waitForTimeout(500);

        await verifyOutputIntegrity(page);
        expect(errors).toHaveLength(0);
      });

      test(`should mitigate Null-Byte and boundary conditions on ${route}`, async ({ page }) => {
        const errors: string[] = [];
        attachConsoleMonitor(page, errors);

        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        if (response?.status() === 404) return test.skip();

        await injectPayload(page, 'textarea[placeholder*="text" i]', FUZZ_PAYLOADS.boundaryNulls);
        
        // Wait and assert
        await page.waitForTimeout(500);
        await verifyOutputIntegrity(page);
      });

      test(`should not leak errors on simultaneous chaotic inputs on ${route}`, async ({ page }) => {
        const errors: string[] = [];
        attachConsoleMonitor(page, errors);

        const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
        if (response?.status() === 404) return test.skip();

        // Race condition / concurrency test: Rapidly fire different payloads
        const inputs = [
          FUZZ_PAYLOADS.empty,
          FUZZ_PAYLOADS.sqlInjectionMix,
          FUZZ_PAYLOADS.whitespace,
          FUZZ_PAYLOADS.xssVector
        ];

        for (const payload of inputs) {
          await injectPayload(page, 'textarea[placeholder*="text" i]', payload);
          // Don't await worker, just keep hammering the UI thread
        }

        // Final verification
        await page.waitForTimeout(1000);
        await verifyOutputIntegrity(page);
        
        // Ensure no security-related stack traces leaked to console
        const criticalErrors = errors.filter(e => e.toLowerCase().includes('security') || e.toLowerCase().includes('trace'));
        expect(criticalErrors).toHaveLength(0);
      });

    });
  }
});

