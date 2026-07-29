'use client'

import React, { useState } from 'react'
import { ADVISOR_TREE, DecisionNode } from '../../lib/advisor/treeData'
import QuestionCard from './QuestionCard'
import RecommendationCard from './RecommendationCard'

type HistoryEntry = {
  nodeId: string
  summary: string
}

export default function DecisionTree() {
  const [currentNodeId, setCurrentNodeId] = useState<string>('start')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const currentNode: DecisionNode = ADVISOR_TREE[currentNodeId]

  const handleAnswer = (nextId: string, summary: string) => {
    setHistory((prev) => [...prev, { nodeId: currentNodeId, summary }])
    setCurrentNodeId(nextId)
  }

  const handleGoBack = () => {
    if (history.length === 0) return
    const newHistory = [...history]
    const lastEntry = newHistory.pop()
    setHistory(newHistory)
    if (lastEntry) {
      setCurrentNodeId(lastEntry.nodeId)
    }
  }

  const handleRestart = () => {
    setCurrentNodeId('start')
    setHistory([])
  }

  if (!currentNode) {
    return (
      <div className="p-8 text-center text-red-500">
        Error: Node &quot;{currentNodeId}&quot; not found in decision tree.
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Breadcrumb / History */}
      {history.length > 0 && (
        <nav
          aria-label="Decision history"
          className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Your Requirements
            </h3>
            <div className="flex gap-3">
              <button
                onClick={handleGoBack}
                className="text-sm font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
                aria-label="Go back one step"
              >
                Go Back
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <button
                onClick={handleRestart}
                className="text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                aria-label="Restart advisor"
              >
                Restart
              </button>
            </div>
          </div>
          
          <ul className="space-y-3">
            {history.map((step, index) => (
              <li key={index} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-[10px] font-bold text-teal-700 dark:bg-teal-900/50 dark:text-teal-400">
                  ✓
                </span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {step.summary}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* Main Node Content */}
      <div className="min-h-[400px]">
        {currentNode.type === 'question' ? (
          <QuestionCard node={currentNode} onAnswer={handleAnswer} />
        ) : (
          <RecommendationCard node={currentNode} />
        )}
      </div>

      {/* Action footer for restarts at the end */}
      {currentNode.type === 'recommendation' && (
        <div className="flex justify-center pt-8 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleRestart}
            className="rounded-full px-6 py-2.5 text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Start Over
          </button>
        </div>
      )}
    </div>
  )
}
