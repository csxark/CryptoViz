import { describe, expect, it } from "vitest";
import {
  DOC_PROGRESS_VERSION,
  getDocumentationProgressPercent,
  normalizeDocumentationProgress,
  toggleProgressValue,
} from "../../lib/utils/documentationProgress";

describe("documentation progress utilities", () => {
  it("normalizes malformed storage values", () => {
    expect(normalizeDocumentationProgress(null)).toEqual({
      version: DOC_PROGRESS_VERSION,
      bookmarks: [],
      completed: [],
    });
  });

  it("removes duplicates and invalid values", () => {
    expect(
      normalizeDocumentationProgress({
        bookmarks: ["caesar-cipher", "caesar-cipher", 42],
        completed: ["getting-started", false],
      }),
    ).toEqual({
      version: DOC_PROGRESS_VERSION,
      bookmarks: ["caesar-cipher"],
      completed: ["getting-started"],
    });
  });

  it("drops slugs that no longer exist", () => {
    const valid = new Set(["getting-started"]);

    expect(
      normalizeDocumentationProgress(
        {
          bookmarks: ["removed-doc", "getting-started"],
          completed: ["removed-doc"],
        },
        valid,
      ),
    ).toEqual({
      version: DOC_PROGRESS_VERSION,
      bookmarks: ["getting-started"],
      completed: [],
    });
  });

  it("toggles values without duplicates", () => {
    expect(toggleProgressValue([], "aes")).toEqual(["aes"]);
    expect(toggleProgressValue(["aes"], "aes")).toEqual([]);
  });

  it("calculates a safe completion percentage", () => {
    expect(getDocumentationProgressPercent(3, 10)).toBe(30);
    expect(getDocumentationProgressPercent(1, 0)).toBe(0);
  });
});
