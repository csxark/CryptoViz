/**
 * visualizerContractHarness.ts
 *
 * Issue #1119 — Standardised Visualizer Component Contract Test Harness
 *
 * Provides a generic `testVisualizerContract` helper that can be called
 * from any describe-block to exercise a visualizer component against a
 * comprehensive suite of edge-case step states without coupling the
 * harness to any single component's internal implementation.
 *
 * Usage:
 *   import { testVisualizerContract } from '../../helpers/visualizerContractHarness'
 *   describe('MyVisualizer', () => testVisualizerContract(MyVisualizer, mockSteps))
 */

import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { axe } from 'jest-axe'
import type { CipherStep, CipherResult } from '../../lib/cipher/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisualizerStepProps {
  result?: CipherResult | null
  currentStep?: number
  steps?: CipherStep[]
  matrix?: string[][] | string
  highlight?: number[]
  highlights?: number[]
  onStepChange?: (index: number) => void
  [key: string]: unknown
}

export interface ContractHarnessOptions {
  extraProps?: Record<string, unknown>
  skipA11y?: boolean
  usesResultSteps?: boolean
  stepCountForCurrentStep?: number
  highlightPropName?: 'highlight' | 'highlights'
}

// ---------------------------------------------------------------------------
// Mock data builders
// ---------------------------------------------------------------------------

export function makeStep(index: number, overrides: Partial<CipherStep> = {}): CipherStep {
  return {
    index,
    label: `Step ${index + 1}`,
    inputState: `in-${index}`,
    outputState: `out-${index}`,
    note: `Note for step ${index}`,
    ...overrides,
  }
}

export function makeSteps(n: number, overrides: Partial<CipherStep> = {}): CipherStep[] {
  return Array.from({ length: n }, (_, i) => makeStep(i, overrides))
}

export function makeResult(steps: CipherStep[]): CipherResult {
  return {
    output: 'deadbeef',
    outputEncoding: 'hex',
    durationMs: 0.1,
    metadata: { name: 'test-cipher', securityStatus: 'secure' },
    steps,
  }
}

export const PLAYFAIR_MATRIX_2D: string[][] = [
  ['M', 'O', 'N', 'A', 'R'],
  ['C', 'H', 'Y', 'B', 'D'],
  ['E', 'F', 'G', 'I', 'K'],
  ['L', 'P', 'Q', 'S', 'T'],
  ['U', 'V', 'W', 'X', 'Z'],
]

export const PLAYFAIR_MATRIX_STR = 'MONARCHYBDEFGIKLPQSTUVWXZ'

export const RAIL_FENCE_MATRIX: string[][] = [
  ['H', '.', 'L', '.', 'O', '.'],
  ['.', 'E', '.', 'L', '.', '!'],
  ['.', '.', '.', '.', '.', '.'],
]

// ---------------------------------------------------------------------------
// DOM measurement stubs
// ---------------------------------------------------------------------------

export function installDomMeasurementStubs() {
  if (!globalThis.ResizeObserver) {
    globalThis.ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }

  if (!globalThis.IntersectionObserver) {
    globalThis.IntersectionObserver = class MockIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof IntersectionObserver
  }
}

// ---------------------------------------------------------------------------
// Error Boundary helper
// ---------------------------------------------------------------------------

interface BoundaryState { hasError: boolean }

class ContractErrorBoundary extends React.Component<
  { children: React.ReactNode },
  BoundaryState
> {
  static displayName = 'ContractErrorBoundary'
  caught: Error | null = null

  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  componentDidCatch(e: Error) {
    this.caught = e
  }

  render() {
    if (this.state.hasError)
      return React.createElement('div', { 'data-testid': 'boundary-caught' })
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Core harness
// ---------------------------------------------------------------------------

export function testVisualizerContract(
   
  Component: React.ComponentType<any>,
  mockSteps: CipherStep[],
  options: ContractHarnessOptions = {},
) {
  const {
    extraProps = {},
    skipA11y = false,
    usesResultSteps = false,
    stepCountForCurrentStep = 9,
    highlightPropName = 'highlights',
  } = options

  const componentName = Component.displayName ?? Component.name ?? 'UnknownVisualizer'

  function buildProps(stepIndex: number, steps: CipherStep[]): Record<string, unknown> {
    if (usesResultSteps) {
      return { result: makeResult(steps), currentStep: stepIndex, ...extraProps }
    }
    // If extraProps contains 'steps' key, it is a steps-array-style component
    if ('steps' in extraProps || steps.length > 0) {
      return { steps, currentStep: stepIndex, ...extraProps }
    }
    return { currentStep: stepIndex, ...extraProps }
  }

  function safeRender(props: Record<string, unknown>) {
    const boundaryRef = React.createRef<ContractErrorBoundary>()
    const result = render(
      React.createElement(
        ContractErrorBoundary,
        { ref: boundaryRef },
        React.createElement(Component, props),
      ),
    )
    const error = boundaryRef.current?.caught ?? null
    return { result, error }
  }

  beforeAll(() => installDomMeasurementStubs())
  afterEach(() => cleanup())

  // 1. Render-without-throw for every step
  describe(`${componentName} — renders safely for every step index`, () => {
    mockSteps.forEach((_, i) => {
      it(`does not throw at step ${i}`, () => {
        const { error } = safeRender(buildProps(i, mockSteps))
        expect(error).toBeNull()
      })
    })

    // currentStep-only components: sweep 0 → stepCountForCurrentStep
    if (!usesResultSteps && !extraProps['steps']) {
      for (let i = 0; i <= stepCountForCurrentStep; i++) {
        const idx = i
        it(`currentStep=${idx} does not throw`, () => {
          const { error } = safeRender({ currentStep: idx, ...extraProps })
          expect(error).toBeNull()
        })
      }
    }
  })

  // 2. Empty steps
  describe(`${componentName} — empty steps`, () => {
    it('renders gracefully with an empty steps array', () => {
      const props = usesResultSteps
        ? { result: makeResult([]), currentStep: 0, ...extraProps }
        : { steps: [], currentStep: 0, ...extraProps }
      const { error } = safeRender(props)
      expect(error).toBeNull()
    })

    if (usesResultSteps) {
      it('renders gracefully when result is null', () => {
        const { error } = safeRender({ result: null, currentStep: 0, ...extraProps })
        expect(error).toBeNull()
      })
    }
  })

  // 3. Single step
  describe(`${componentName} — single step`, () => {
    it('renders with exactly one step', () => {
      const { error } = safeRender(buildProps(0, [makeStep(0)]))
      expect(error).toBeNull()
    })
  })

  // 4. Highlight edge cases
  describe(`${componentName} — highlight edge cases`, () => {
    it('renders with empty highlights', () => {
      const { error } = safeRender({ ...buildProps(0, mockSteps), [highlightPropName]: [] })
      expect(error).toBeNull()
    })
    it('renders with a single highlight', () => {
      const { error } = safeRender({ ...buildProps(0, mockSteps), [highlightPropName]: [0] })
      expect(error).toBeNull()
    })
    it('renders with out-of-range highlight index', () => {
      const { error } = safeRender({ ...buildProps(0, mockSteps), [highlightPropName]: [9999] })
      expect(error).toBeNull()
    })
  })

  // 5. Undefined / empty optional fields
  describe(`${componentName} — optional field edge cases`, () => {
    const optionalFieldCases: Array<[string, Partial<CipherStep>]> = [
      ['note undefined', { note: undefined }],
      ['note empty', { note: '' }],
      ['table undefined', { table: undefined }],
      ['matrix undefined', { matrix: undefined }],
      ['sublabel undefined', { sublabel: undefined }],
    ]
    optionalFieldCases.forEach(([label, override]) => {
      it(`renders when ${label}`, () => {
        const { error } = safeRender(buildProps(0, [makeStep(0, override)]))
        expect(error).toBeNull()
      })
    })
  })

  // 6. Large step content
  describe(`${componentName} — large step content`, () => {
    it('renders with very large inputState/outputState', () => {
      const { error } = safeRender(buildProps(0, [makeStep(0, { inputState: 'a'.repeat(2048), outputState: 'b'.repeat(2048) })]))
      expect(error).toBeNull()
    })
    it('renders with a very long note (~5000 chars)', () => {
      const { error } = safeRender(buildProps(0, [makeStep(0, { note: 'Long note. '.repeat(454) })]))
      expect(error).toBeNull()
    })
    it('renders with a large table (100 rows)', () => {
      const table = Array.from({ length: 100 }, (_, i) => ({ key: `k${i}`, value: `v${i}`.repeat(32) }))
      const { error } = safeRender(buildProps(0, [makeStep(0, { table })]))
      expect(error).toBeNull()
    })
  })

  // 7. Malformed matrix dimensions
  describe(`${componentName} — malformed matrix`, () => {
    it('does not throw when step matrix is a 3×4 array', () => {
      const bad = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['I', 'J', 'K', 'L']]
      const { error } = safeRender(buildProps(0, [makeStep(0, { matrix: bad })]))
      expect(error).toBeNull()
    })
    it('does not throw when step matrix is an empty 2D array', () => {
      const { error } = safeRender(buildProps(0, [makeStep(0, { matrix: [] })]))
      expect(error).toBeNull()
    })
  })

  // 8. Highlighted elements resolve to valid DOM nodes
  describe(`${componentName} — highlighted element DOM resolution`, () => {
    it('aria-selected=true elements are valid DOM nodes when highlights are provided', () => {
      const { result } = safeRender({ ...buildProps(0, mockSteps), [highlightPropName]: [0] })
      const highlighted = result.container.querySelectorAll('[aria-selected="true"]')
      highlighted.forEach((el) => {
        expect(el).toBeTruthy()
        expect(el.nodeType).toBe(Node.ELEMENT_NODE)
      })
    })
  })

  // 9. Accessibility
  if (!skipA11y) {
    describe(`${componentName} — accessibility`, () => {
      it('has no axe WCAG violations at step 0', async () => {
        const { result } = safeRender(buildProps(0, mockSteps))
        expect(await axe(result.container)).toHaveNoViolations()
      })

      it('interactive role elements have accessible names', () => {
        const { result } = safeRender(buildProps(0, mockSteps))
        const interactiveRoles = ['button', 'link', 'combobox', 'slider']
        interactiveRoles.forEach((role) => {
          result.container.querySelectorAll(`[role="${role}"]`).forEach((el) => {
            const hasName = !!(
              el.getAttribute('aria-label') ||
              el.getAttribute('aria-labelledby') ||
              (el as HTMLElement).textContent?.trim()
            )
            expect(hasName, `[role="${role}"] missing accessible name: ${el.outerHTML.slice(0, 100)}`).toBe(true)
          })
        })
      })

      it('gridcells carry aria-label when grid role is present', () => {
        const { result } = safeRender(buildProps(0, mockSteps))
        const grid = result.container.querySelector('[role="grid"]')
        if (!grid) return
        grid.querySelectorAll('[role="gridcell"]').forEach((cell) => {
          expect(cell.getAttribute('aria-label'), `gridcell missing aria-label: ${cell.outerHTML.slice(0, 80)}`).toBeTruthy()
        })
      })
    })
  }

  // 10. Out-of-range currentStep
  describe(`${componentName} — out-of-range currentStep`, () => {
    it('does not throw when currentStep is beyond steps.length', () => {
      const steps = makeSteps(3)
      const props = usesResultSteps
        ? { result: makeResult(steps), currentStep: 9999, ...extraProps }
        : { steps, currentStep: 9999, ...extraProps }
      const { error } = safeRender(props)
      expect(error).toBeNull()
    })
    it('does not throw when currentStep is negative', () => {
      const steps = makeSteps(3)
      const props = usesResultSteps
        ? { result: makeResult(steps), currentStep: -1, ...extraProps }
        : { steps, currentStep: -1, ...extraProps }
      const { error } = safeRender(props)
      expect(error).toBeNull()
    })
  })
}

// ---------------------------------------------------------------------------
// Matrix-specific contract
// ---------------------------------------------------------------------------

export function testMatrixVisualizerContract(
   
  Component: React.ComponentType<any>,
  validMatrix: string[][] | string,
  options: {
    extraProps?: Record<string, unknown>
    skipA11y?: boolean
    highlightPropName?: 'highlight' | 'highlights'
    /**
     * Set to false for components whose matrix prop is typed as string[][] only
     * (not string). Skips the "string as matrix" malformed-matrix edge case.
     * Default: true
     */
    allowStringMatrix?: boolean
  } = {},
) {
  const { extraProps = {}, skipA11y = false, highlightPropName = 'highlights', allowStringMatrix = true } = options
  const componentName = Component.displayName ?? Component.name ?? 'UnknownVisualizer'

  function safeRender(props: Record<string, unknown>) {
    const boundaryRef = React.createRef<ContractErrorBoundary>()
    const result = render(
      React.createElement(
        ContractErrorBoundary,
        { ref: boundaryRef },
        React.createElement(Component, props),
      ),
    )
    return { result, error: boundaryRef.current?.caught ?? null }
  }

  beforeAll(() => installDomMeasurementStubs())
  afterEach(() => cleanup())

  describe(`${componentName} — no matrix prop`, () => {
    it('renders gracefully when matrix prop is omitted', () => {
      expect(safeRender({ ...extraProps }).error).toBeNull()
    })
    it('renders gracefully when matrix is an empty string', () => {
      expect(safeRender({ matrix: '', ...extraProps }).error).toBeNull()
    })
    it('renders gracefully when matrix is an empty 2D array', () => {
      expect(safeRender({ matrix: [], ...extraProps }).error).toBeNull()
    })
  })

  describe(`${componentName} — valid matrix`, () => {
    it('renders with no highlights', () => {
      expect(safeRender({ matrix: validMatrix, ...extraProps }).error).toBeNull()
    })
    it('renders with empty highlights', () => {
      expect(safeRender({ matrix: validMatrix, [highlightPropName]: [], ...extraProps }).error).toBeNull()
    })
    it('renders with single highlight', () => {
      expect(safeRender({ matrix: validMatrix, [highlightPropName]: [0], ...extraProps }).error).toBeNull()
    })
    it('renders with multiple highlights', () => {
      expect(safeRender({ matrix: validMatrix, [highlightPropName]: [0, 6, 12, 18, 24], ...extraProps }).error).toBeNull()
    })
    it('renders with out-of-range highlight', () => {
      expect(safeRender({ matrix: validMatrix, [highlightPropName]: [9999], ...extraProps }).error).toBeNull()
    })
    it('highlighted cells are real DOM nodes', () => {
      const { result } = safeRender({ matrix: validMatrix, [highlightPropName]: [0], ...extraProps })
      result.container.querySelectorAll('[aria-selected="true"]').forEach((el) => {
        expect(el.nodeType).toBe(Node.ELEMENT_NODE)
      })
    })
  })

  describe(`${componentName} — malformed matrix`, () => {
    it('does not throw with 3×4 matrix', () => {
      expect(safeRender({ matrix: [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H'], ['I', 'J', 'K', 'L']], ...extraProps }).error).toBeNull()
    })
    it('does not throw with unequal row lengths', () => {
      expect(safeRender({ matrix: [['A', 'B'], ['C'], ['D', 'E', 'F']], ...extraProps }).error).toBeNull()
    })
    if (allowStringMatrix) {
      it('does not throw with a 10-char string (invalid 5×5)', () => {
        expect(safeRender({ matrix: 'ABCDEFGHIJ', ...extraProps }).error).toBeNull()
      })
    }
  })

  if (!skipA11y) {
    describe(`${componentName} — accessibility`, () => {
      it('has no axe WCAG violations', async () => {
        const { result } = safeRender({ matrix: validMatrix, ...extraProps })
        expect(await axe(result.container)).toHaveNoViolations()
      })
      it('gridcells carry aria-label when grid is present', () => {
        const { result } = safeRender({ matrix: validMatrix, [highlightPropName]: [0], ...extraProps })
        const grid = result.container.querySelector('[role="grid"]')
        if (!grid) return
        grid.querySelectorAll('[role="gridcell"]').forEach((cell) => {
          expect(cell.getAttribute('aria-label')).toBeTruthy()
        })
      })
    })
  }
}
