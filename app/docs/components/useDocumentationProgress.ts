"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EMPTY_DOCUMENTATION_PROGRESS,
  clearDocumentationProgress,
  getDocumentationProgressPercent,
  loadDocumentationProgress,
  saveDocumentationProgress,
  toggleProgressValue,
  type DocumentationProgress,
} from "../../../lib/utils/documentationProgress";

export function useDocumentationProgress(slugs: string[]) {
  const validSlugs = useMemo(() => new Set(slugs), [slugs]);
  const [progress, setProgress] = useState<DocumentationProgress>(
    EMPTY_DOCUMENTATION_PROGRESS,
  );
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setProgress(loadDocumentationProgress(validSlugs));
    setHasLoaded(true);
  }, [validSlugs]);

  const update = useCallback(
    (updater: (current: DocumentationProgress) => DocumentationProgress) => {
      setProgress((current) => {
        const next = updater(current);
        saveDocumentationProgress(next);
        return next;
      });
    },
    [],
  );

  const toggleBookmark = useCallback(
    (slug: string) => {
      update((current) => ({
        ...current,
        bookmarks: toggleProgressValue(current.bookmarks, slug),
      }));
    },
    [update],
  );

  const toggleCompleted = useCallback(
    (slug: string) => {
      update((current) => ({
        ...current,
        completed: toggleProgressValue(current.completed, slug),
      }));
    },
    [update],
  );

  const clear = useCallback(() => {
    clearDocumentationProgress();
    setProgress(EMPTY_DOCUMENTATION_PROGRESS);
  }, []);

  return {
    progress,
    hasLoaded,
    toggleBookmark,
    toggleCompleted,
    clear,
    percent: getDocumentationProgressPercent(
      progress.completed.length,
      slugs.length,
    ),
  };
}
