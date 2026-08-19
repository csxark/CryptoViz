// ELSoC26 Contribution | Track: UI Components
'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export default function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20',
        className
      )}
    >
      {icon && (
        <motion.div
          initial={{ y: 5 }}
          animate={{ y: 0 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          className="mb-4 text-zinc-400 dark:text-zinc-500"
        >
          {icon}
        </motion.div>
      )}
      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
