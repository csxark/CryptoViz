import React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { axe } from 'jest-axe'
import CertificatePage from '../../../app/learning-paths/[pathId]/certificate/page'
import VerifyPage from '../../../app/learning-paths/verify/page'

// Mock next/navigation
vi.mock('next/navigation', () => {
  const mockParams = {
    get: (key: string) => {
      if (key === 'name') return 'Alice'
      if (key === 'pathId') return 'cryptography-fundamentals'
      if (key === 'date') return '2026-08-13'
      if (key === 'hash') return 'c44766860d5bfa7808fb8ee45970c6bc86ec576c985a9dfdf3bfcf8db01c60da'
      return null
    },
    toString: () => 'name=Alice&pathId=cryptography-fundamentals&date=2026-08-13&hash=c44766860d5bfa7808fb8ee45970c6bc86ec576c985a9dfdf3bfcf8db01c60da',
  }

  return {
    useSearchParams: () => mockParams,
    usePathname: () => '/learning-paths/verify',
  }
})

// Mock useLearningPath hook
vi.mock('@/lib/hooks/useLearningPath', () => ({
  useLearningPath: () => ({
    progress: {
      completedLessons: {},
      quizScores: {},
      lastActiveLesson: null,
      completedPaths: { 'cryptography-fundamentals': true },
    },
    getPathProgressPercentage: () => 100,
  }),
}))

describe('Certificate UI Accessibility (a11y)', () => {
  it('has zero axe accessibility violations on CertificatePage', async () => {
    const params = Promise.resolve({ pathId: 'cryptography-fundamentals' })
    const { container } = render(<CertificatePage params={params} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has zero axe accessibility violations on VerifyPage', async () => {
    const { container } = render(<VerifyPage />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
