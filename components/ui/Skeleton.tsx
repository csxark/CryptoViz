'use client'

import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800',
        className
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <Skeleton className="mb-3 h-4 w-1/3" />
      <Skeleton className="mb-2 h-12 w-full" />
      <Skeleton className="mb-2 h-8 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  )
}

export function SkeletonOutput() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <Skeleton className="mb-3 h-3 w-1/4" />
      <Skeleton className="mb-2 h-10 w-full" />
      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function SkeletonStep() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <div className="py-4">
        <Skeleton className="mb-3 h-12 w-full" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      <div className="mt-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
        <Skeleton className="h-6 w-full" />
      </div>
    </div>
  )
}
