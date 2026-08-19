// ELSoC26 Contribution | Track: UI Components
'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
  skeleton?: boolean
}

export default function LoadingState({ message = 'Loading...', className, skeleton = true }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-4 p-8 w-full',
        className,
        !skeleton && 'items-center justify-center text-center'
      )}
    >
      <div className={cn("flex items-center gap-3", skeleton ? "justify-start" : "justify-center")}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          <Loader2 className="h-5 w-5 text-teal-600 dark:text-teal-500" strokeWidth={2.5} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
        >
          {message}
        </motion.p>
      </div>

      {skeleton && (
        <div className="space-y-3 pt-2">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/70" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/70" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-700/70" />
        </div>
      )}
    </div>
  )
}
