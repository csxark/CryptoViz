import { expect, test } from "@playwright/test";

test.describe("Canvas and SVG Cipher Diagram Visual Regression Baselines (#1476)", () => {

  test("Playfair grid diagram visual baseline (Canvas/SVG)", async ({ page }) => {
    await page.goto("/visualizer/playfair/");
    await page.waitForLoadState("networkidle");

    // Target diagram container / canvas grid element
    const diagramElement = page.locator("canvas, svg, [data-testid='playfair-matrix-grid']").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("playfair-diagram.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("playfair-page-baseline.png", { fullPage: true });
    }
  });

  test("Rail Fence transposition diagram visual baseline", async ({ page }) => {
    await page.goto("/visualizer/railfence/");
    await page.waitForLoadState("networkidle");

    const diagramElement = page.locator("canvas, svg, .matrix-grid").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("railfence-diagram.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("railfence-page-baseline.png", { fullPage: true });
    }
  });

  test("Diffie-Hellman key exchange visual baseline", async ({ page }) => {
    await page.goto("/visualizer/dh/");
    await page.waitForLoadState("networkidle");

    const diagramElement = page.locator("svg, canvas, [aria-label*='Diffie-Hellman']").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("dh-diagram.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("dh-page-baseline.png", { fullPage: true });
    }
  });

  test("HMAC construction diagram visual baseline", async ({ page }) => {
    await page.goto("/visualizer/hmac/");
    await page.waitForLoadState("networkidle");

    const diagramElement = page.locator("svg, canvas, [aria-label*='HMAC']").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("hmac-diagram.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("hmac-page-baseline.png", { fullPage: true });
    }
  });

  test("SM3 compression function diagram visual baseline", async ({ page }) => {
    await page.goto("/visualizer/sm3/");
    await page.waitForLoadState("networkidle");

    const diagramElement = page.locator("svg, canvas, [aria-label*='SM3']").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("sm3-diagram.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("sm3-page-baseline.png", { fullPage: true });
    }
  });

  test("AES 2D state matrix visual baseline", async ({ page }) => {
    await page.goto("/visualizer/aes/");
    await page.waitForLoadState("networkidle");

    const diagramElement = page.locator("canvas, svg, .grid").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("aes-state-matrix.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("aes-page-baseline.png", { fullPage: true });
    }
  });

  test("S-Box Explorer visual baseline", async ({ page }) => {
    await page.goto("/sbox-explorer/");
    await page.waitForLoadState("networkidle");

    const diagramElement = page.locator("canvas, svg, table").first();
    if (await diagramElement.isVisible()) {
      await expect(diagramElement).toHaveScreenshot("sbox-explorer-diagram.png", {
        animations: "disabled",
      });
    } else {
      await expect(page).toHaveScreenshot("sbox-explorer-page.png", { fullPage: true });
    }
  });

  test("Dark mode visualizer diagram visual baseline", async ({ page }) => {
    await page.goto("/visualizer/caesar/");
    await page.emulateMedia({ colorScheme: "dark" });
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveScreenshot("caesar-dark-mode-baseline.png", { fullPage: true });
  });
});
