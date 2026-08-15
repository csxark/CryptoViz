'use client'

import type { Diagnostic, RemediationOption } from '../../lib/utils/cryptoDiagnostics'

interface CryptoDiagnosticBannerProps {
  diagnostic: Diagnostic
  onRemediation: (value: string | number) => void
  className?: string
}

export function CryptoDiagnosticBanner({
  diagnostic,
  onRemediation,
  className = '',
}: CryptoDiagnosticBannerProps) {
  return (
    <div
      className={`mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-600 dark:text-amber-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Cryptographic Input Issue
          </h3>
          
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            {diagnostic.explanation}
          </p>
          
          {diagnostic.suggestedRemediation.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                Suggested fixes:
              </p>
              <div className="flex flex-wrap gap-2">
                {diagnostic.suggestedRemediation.map((option: RemediationOption, index: number) => (
                  <button
                    key={index}
                    onClick={() => onRemediation(option.value)}
                    className="inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:border-amber-700 dark:bg-amber-900 dark:text-amber-100 dark:hover:bg-amber-800 dark:focus:ring-offset-amber-950"
                    title={option.description}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
