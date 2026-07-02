import { clsx } from 'clsx'

interface DocCalloutProps {
  variant?: 'info' | 'warning' | 'danger'
  children: React.ReactNode
}

const variantStyles = {
  info: {
    container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    label: 'Info',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    label: 'Warning',
  },
  danger: {
    container: 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
    icon: 'text-red-600 dark:text-red-400',
    label: 'Danger',
  },
}

export default function DocCallout({ variant = 'info', children }: DocCalloutProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={clsx(
        'my-6 flex gap-3 rounded-xl border p-4',
        styles.container
      )}
    >
      <span className={clsx('mt-0.5 shrink-0 text-sm font-bold uppercase tracking-wider', styles.icon)}>
        {styles.label}
      </span>
      <div className="text-sm text-zinc-700 dark:text-zinc-300 [&>p]:my-0">
        {children}
      </div>
    </div>
  )
}
