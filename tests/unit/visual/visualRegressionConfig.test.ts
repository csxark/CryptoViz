import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Visual Regression Test Suite Configuration (#1476)", () => {
  const configContent = readFileSync(resolve(process.cwd(), "playwright.config.ts"), "utf-8");

  it("configures Playwright testDir and testMatch for visual baseline tests", () => {
    expect(configContent).toContain('testDir: "./tests"');
    expect(configContent).toContain("visual/**/*.spec.ts");
    expect(configContent).toContain("e2e/**/*.spec.ts");
  });

  it("disables animations and hides caret in expect screenshot options", () => {
    expect(configContent).toContain('animations: "disabled"');
    expect(configContent).toContain('caret: "hide"');
    expect(configContent).toContain('scale: "css"');
  });

  it("configures viewport sizes for desktop baseline project", () => {
    expect(configContent).toContain('width: 1440, height: 1000');
  });
});
