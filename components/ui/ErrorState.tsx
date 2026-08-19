// ELSoC26 Contribution | Track: UI Components
'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ErrorStateProps {
  title?: string
  error: string | Error | null
  onRetry?: () => void
  className?: string
}

export default function ErrorState({ title = 'Execution Error', error, onRetry, className }: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : 'An unknown error occurred.'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'rounded-xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <motion.div
          animate={{ rotate: [-5, 5, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="shrink-0 pt-0.5"
        >
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" strokeWidth={2.5} />
        </motion.div>
        
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <h4 className="text-sm font-bold text-red-900 dark:text-red-300">
            {title}
          </h4>
          <p className="text-xs text-red-800/80 dark:text-red-400/90 break-words leading-relaxed">
            {errorMessage}
          </p>
          
          {onRetry && (
            <div className="mt-2">
              <button
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition-all hover:bg-red-50 hover:border-red-300 active:scale-95 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Retry Computation
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
