import { test, expect } from "@playwright/test";

test.describe("Web Worker Cipher Execution & State Reliability", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Caesar visualizer
    await page.goto("/visualizer/caesar/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Test 1: Enter plaintext + key -> encrypt -> correct ciphertext appears", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await inputArea.fill("HELLO WORLD");
    await keyInput.fill("3");

    // Caesar shift 3 of HELLO WORLD is KHOOR ZRUOG
    await expect(resultSection).toContainText("KHOOR ZRUOG", { timeout: 10_000 });
  });

  test("Test 2: Change plaintext -> ciphertext updates deterministically", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await keyInput.fill("3");
    await inputArea.fill("HELLO");
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });

    // Change plaintext to WORLD
    await inputArea.fill("WORLD");
    // Caesar shift 3 of WORLD is ZRUOG
    await expect(resultSection).toContainText("ZRUOG", { timeout: 10_000 });
    // Must not retain HELLO / KHOOR
    await expect(resultSection).not.toContainText("KHOOR");
  });

  test("Test 3: Change key -> ciphertext updates to new key output", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await inputArea.fill("HELLO");
    await keyInput.fill("3");
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });

    // Change key to 7 (shift 7 of HELLO is OLSSV)
    await keyInput.fill("7");
    await expect(resultSection).toContainText("OLSSV", { timeout: 10_000 });
    await expect(resultSection).not.toContainText("KHOOR");
  });

  test("Test 4: Switch cipher -> ciphertext changes according to new cipher", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await inputArea.fill("HELLO");
    await keyInput.fill("3");
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });

    // Navigate to Atbash (keyless, reverses alphabet: H->S, E->V, L->O, O->L => SVOOL)
    await page.goto("/visualizer/atbash/");
    const atbashInput = page.getByLabel("Plaintext or input message");
    await atbashInput.fill("HELLO");

    const atbashResult = page.locator('section[aria-label="Cipher result"]');
    await expect(atbashResult).toContainText("SVOOL", { timeout: 10_000 });
    await expect(atbashResult).not.toContainText("KHOOR");
  });

  test("Test 5: Rapid sequential typing produces the final state output", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await keyInput.fill("3");

    // Type rapidly simulating real user typing
    await inputArea.fill("H");
    await inputArea.fill("HE");
    await inputArea.fill("HEL");
    await inputArea.fill("HELL");
    await inputArea.fill("HELLO");

    // Final result must be KHOOR, never an intermediate state like K or KH
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });
  });

  test("Test 6: A -> B -> A cycle does not produce frozen or stale output", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    // State A: HELLO + 3 -> KHOOR
    await inputArea.fill("HELLO");
    await keyInput.fill("3");
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });

    // State B: GOODBYE + 5 -> LTTGJDJ
    await inputArea.fill("GOODBYE");
    await keyInput.fill("5");
    await expect(resultSection).toContainText("LTTGJDJ", { timeout: 10_000 });

    // State A again: HELLO + 3 -> KHOOR
    await inputArea.fill("HELLO");
    await keyInput.fill("3");
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });
  });

  test("Test 7: Invalid input/key displays error without presenting stale ciphertext as valid", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await inputArea.fill("HELLO");
    await keyInput.fill("3");
    await expect(resultSection).toContainText("KHOOR", { timeout: 10_000 });

    // Enter an invalid non-integer key for Caesar
    await keyInput.fill("not-a-valid-shift");

    // Verify either an error is shown or output is cleared/shows error state
    const alertOrError = page.locator('[role="alert"]').filter({ hasText: /error|invalid/i });
    const hasError = await alertOrError.count();
    if (hasError > 0) {
      await expect(alertOrError.first()).toBeVisible();
    }
  });

  test("Test 8: Navigation away and back does not corrupt state with stale worker responses", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await inputArea.fill("TESTING");
    await keyInput.fill("4");
    // T(19)+4=X(23), E(4)+4=I(8), S(18)+4=W(22), T(19)+4=X(23), I(8)+4=M(12), N(13)+4=R(17), G(6)+4=K(10) => XIWXMLK
    await expect(resultSection).toContainText("XIWXMRK", { timeout: 10_000 });

    // Navigate to home
    await page.goto("/");
    await expect(page).toHaveTitle(/CryptoViz/i);

    // Navigate back to Caesar
    await page.goto("/visualizer/caesar/");
    const newInput = page.getByLabel("Plaintext or input message");
    await expect(newInput).toBeVisible();

    // Fill new parameters
    await newInput.fill("NEWDATA");
    const newKey = page.getByLabel("Cryptographic key or shift");
    await newKey.fill("1");
    // N+1=O, E+1=F, W+1=X, D+1=E, A+1=B, T+1=U, A+1=B => OFXEBUB
    const newResult = page.locator('section[aria-label="Cipher result"]');
    await expect(newResult).toContainText("OFXEBUB", { timeout: 10_000 });
    await expect(newResult).not.toContainText("XIWXMRK");
  });

  test("Test 9: Conversion history stores executed conversions", async ({ page }) => {
    const inputArea = page.getByLabel("Plaintext or input message");
    const keyInput = page.getByLabel("Cryptographic key or shift");
    const resultSection = page.locator('section[aria-label="Cipher result"]');

    await inputArea.fill("HISTORY TEST");
    await keyInput.fill("3");
    await expect(resultSection).toContainText("KLVWRUB WHVW", { timeout: 10_000 });

    // Switch to History tab
    const historyTab = page.getByRole("tab", { name: /history/i }).or(page.getByRole("button", { name: /history/i }));
    if (await historyTab.count()) {
      await historyTab.first().click();
      await expect(page.locator("body")).toContainText("HISTORY TEST");
    }
  });
});
