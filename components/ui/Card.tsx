import type { ComponentPropsWithoutRef } from 'react'

export interface CardProps extends ComponentPropsWithoutRef<'div'> {}

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`.trim()}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: CardProps) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`.trim()} {...props} />
}

export function CardTitle({ className = '', ...props }: ComponentPropsWithoutRef<'h3'>) {
  return <h3 className={`font-semibold leading-none tracking-tight ${className}`.trim()} {...props} />
}

export function CardDescription({ className = '', ...props }: ComponentPropsWithoutRef<'p'>) {
  return <p className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`.trim()} {...props} />
}

export function CardContent({ className = '', ...props }: CardProps) {
  return <div className={`p-6 pt-0 ${className}`.trim()} {...props} />
}

export default Card

