"use client";

import React, { useMemo, useState } from "react";
import { Info, X } from "lucide-react";

interface FormulaExplanation {
  symbol: string;
  definition: string;
  example?: string;
}

interface MathBlockProps {
  formula: string;
  explanations?: FormulaExplanation[];
}

export const MathBlock: React.FC<MathBlockProps> = ({
  formula,
  explanations = [],
}) => {
  const [selectedSymbol, setSelectedSymbol] =
    useState<FormulaExplanation | null>(null);

  const formulaParts = useMemo(() => {
    if (!explanations.length) {
      return [{ text: formula, explanation: null }];
    }

    let parts: {
      text: string;
      explanation: FormulaExplanation | null;
    }[] = [{ text: formula, explanation: null }];

    explanations.forEach((item) => {
      parts = parts.flatMap((part) => {
        if (part.explanation || !part.text.includes(item.symbol)) {
          return [part];
        }

        const split = part.text.split(item.symbol);

        return split.flatMap((text, index) => {
          const result: {
            text: string;
            explanation: FormulaExplanation | null;
          }[] = [];

          if (text) {
            result.push({
              text,
              explanation: null,
            });
          }

          if (index < split.length - 1) {
            result.push({
              text: item.symbol,
              explanation: item,
            });
          }

          return result;
        });
      });
    });

    return parts;
  }, [formula, explanations]);

  return (
    <div className="my-4">
      <div className="relative flex min-h-24 items-center justify-center overflow-x-auto rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-950">
        <code className="whitespace-pre-wrap break-words text-center font-mono text-lg text-teal-700 dark:text-teal-400">
          {formulaParts.map((part, index) =>
            part.explanation ? (
              <button
                key={`${part.explanation.symbol}-${index}`}
                type="button"
                onClick={() => setSelectedSymbol(part.explanation)}
                className="mx-0.5 cursor-pointer rounded px-1 font-semibold underline decoration-dotted underline-offset-4 transition-colors hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:bg-teal-950 dark:hover:text-teal-300"
                aria-label={`Explain ${part.explanation.symbol}`}
              >
                {part.text}
              </button>
            ) : (
              <React.Fragment key={index}>
                {part.text}
              </React.Fragment>
            )
          )}
        </code>

        {explanations.length > 0 && (
          <div className="absolute right-3 top-3">
            <Info
              className="h-4 w-4 text-zinc-400"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {explanations.length > 0 && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Click an underlined symbol to learn more.
        </p>
      )}

      {selectedSymbol && (
        <div
          className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/40"
          role="dialog"
          aria-label={`Explanation for ${selectedSymbol.symbol}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-lg font-bold text-teal-700 dark:text-teal-300">
                {selectedSymbol.symbol}
              </p>

              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                {selectedSymbol.definition}
              </p>

              {selectedSymbol.example && (
                <div className="mt-3 rounded-lg bg-white/70 p-3 dark:bg-zinc-900/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Example
                  </p>
                  <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {selectedSymbol.example}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedSymbol(null)}
              className="rounded-md p-1 text-zinc-500 hover:bg-white hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-white"
              aria-label="Close explanation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};