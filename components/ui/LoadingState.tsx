// ELSoC26 Contribution | Track: UI Components
'use client'

import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
}

export default function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 p-8 text-center',
        className
      )}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          ease: 'linear',
          repeat: Infinity,
        }}
      >
        <Loader2 className="h-8 w-8 text-teal-600 dark:text-teal-500" strokeWidth={2} />
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
  )
}
