'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  errorMsg: string
}

export default class WorkerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, errorMsg: '' }
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, errorMsg: error.message }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can also log the error to an error reporting service here
    console.error('WorkerErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/30 dark:bg-red-950/20">
          <svg className="mb-4 h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="mb-2 text-lg font-bold text-red-700 dark:text-red-400">Worker Process Terminated</h2>
          <p className="mb-6 max-w-md text-sm text-red-600 dark:text-red-300">
            The cryptographic Web Worker crashed, likely due to an Out of Memory (OOM) exception from an extreme payload size. 
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Restart Visualizer
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
