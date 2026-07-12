export const DOC_PROGRESS_STORAGE_KEY = "cryptoviz-doc-progress";
export const DOC_PROGRESS_VERSION = 1;

export interface DocumentationProgress {
  version: typeof DOC_PROGRESS_VERSION;
  bookmarks: string[];
  completed: string[];
}

export const EMPTY_DOCUMENTATION_PROGRESS: DocumentationProgress = {
  version: DOC_PROGRESS_VERSION,
  bookmarks: [],
  completed: [],
};

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === "string"),
    ),
  ];
}

export function normalizeDocumentationProgress(
  value: unknown,
  validSlugs?: ReadonlySet<string>,
): DocumentationProgress {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return EMPTY_DOCUMENTATION_PROGRESS;
  }

  const candidate = value as Record<string, unknown>;
  const filterValid = (items: string[]) =>
    validSlugs ? items.filter((slug) => validSlugs.has(slug)) : items;

  return {
    version: DOC_PROGRESS_VERSION,
    bookmarks: filterValid(uniqueStrings(candidate.bookmarks)),
    completed: filterValid(uniqueStrings(candidate.completed)),
  };
}

export function loadDocumentationProgress(
  validSlugs?: ReadonlySet<string>,
): DocumentationProgress {
  if (typeof window === "undefined") return EMPTY_DOCUMENTATION_PROGRESS;

  try {
    const raw = window.localStorage.getItem(DOC_PROGRESS_STORAGE_KEY);
    if (!raw) return EMPTY_DOCUMENTATION_PROGRESS;
    return normalizeDocumentationProgress(JSON.parse(raw), validSlugs);
  } catch {
    return EMPTY_DOCUMENTATION_PROGRESS;
  }
}

export function saveDocumentationProgress(
  progress: DocumentationProgress,
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DOC_PROGRESS_STORAGE_KEY,
    JSON.stringify(normalizeDocumentationProgress(progress)),
  );
}

export function toggleProgressValue(values: string[], slug: string): string[] {
  return values.includes(slug)
    ? values.filter((value) => value !== slug)
    : [...values, slug];
}

export function clearDocumentationProgress(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DOC_PROGRESS_STORAGE_KEY);
}

export function getDocumentationProgressPercent(
  completedCount: number,
  totalCount: number,
): number {
  if (totalCount <= 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}
