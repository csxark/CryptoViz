'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/utils/logger'

interface RouteErrorUIProps {
    error: Error & { digest?: string }
    reset: () => void
    title: string
    message: string
}

export default function RouteErrorUI({ error, reset, title, message }: RouteErrorUIProps) {
    useEffect(() => {
        logger.error(error)
    }, [error])

    return (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center min-h-[50vh]">
            <div className="flex max-w-lg flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 shadow-sm dark:border-red-900/30 dark:bg-red-950/20">
                <svg className="mb-4 h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h2 className="mb-2 text-xl font-bold text-red-700 dark:text-red-400">
                    {title || "Something went wrong while loading this page"}
                </h2>
                <p className="mb-6 text-sm text-red-600 dark:text-red-300">
                    {message || "An unexpected error occurred during rendering. Your stored keys and settings remain safe."}
                </p>                <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                    <button 
                        onClick={() => reset()}
                        className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-400 w-full sm:w-auto"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/"
                        className="rounded-lg bg-zinc-200 px-6 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition-all hover:bg-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700 w-full sm:w-auto text-center"
                    >
                        Go Home
                    </Link>
                </div>
                {process.env.NODE_ENV === 'development' && (
                    <details className="mt-8 text-left w-full rounded-lg border border-red-200 bg-white/50 p-4 dark:border-red-900/50 dark:bg-black/50">
                        <summary className="cursor-pointer text-xs font-semibold text-red-800 dark:text-red-300 select-none">
                            Error Details (Dev Only)
                        </summary>
                        <pre className="mt-4 overflow-x-auto text-[10px] sm:text-xs text-red-900 dark:text-red-200">
                            {error.message}
                            {'\n'}
                            {error.stack}
                        </pre>
                    </details>
                )}
            </div>
        </div>
    )
}
