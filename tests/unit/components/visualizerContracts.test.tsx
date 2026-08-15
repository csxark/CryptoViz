/**
 * visualizerContracts.test.tsx
 *
 * Issue #1119 — Visualizer Component Contract Tests
 *
 * Applies the reusable `testVisualizerContract` / `testMatrixVisualizerContract`
 * harnesses to core visualizer components to verify that they:
 *   - Never throw during rendering across all step states
 *   - Handle all boundary / edge cases safely
 *   - Expose valid ARIA attributes on interactive elements
 *   - Pass axe WCAG accessibility checks
 *
 * Components covered:
 *   - PlayfairGrid          (matrix-visualizer contract)
 *   - RailFenceViz          (matrix-visualizer contract, highlight singular)
 *   - DHVisualizer          (currentStep-driven, no steps array)
 *   - HmacVisualizer        (CipherResult-steps, exactly 5 steps)
 *   - Sm3Visualizer         (CipherResult-steps, multi-step)
 *   - StepAnimator          (steps-array + currentStep + onStepChange)
 *   - AesKeyExpansionVisualizer  (self-contained, no step props)
 *   - IdeaCipherVisualizer       (self-contained, no step props)
 *   - DHMitMVisualizer           (self-contained, no step props)
 */

import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

import {
  testVisualizerContract,
  testMatrixVisualizerContract,
  makeStep,
  makeSteps,
  makeResult,
  PLAYFAIR_MATRIX_2D,
  PLAYFAIR_MATRIX_STR,
  RAIL_FENCE_MATRIX,
  installDomMeasurementStubs,
} from '../../helpers/visualizerContractHarness'

import PlayfairGrid from '../../../components/cipher/PlayfairGrid'
import RailFenceViz from '../../../components/cipher/RailFenceViz'
import DHVisualizer from '../../../components/cipher/DHVisualizer'
import HmacVisualizer from '../../../components/cipher/HmacVisualizer'
import Sm3Visualizer from '../../../components/cipher/Sm3Visualizer'
import StepAnimator from '../../../components/cipher/StepAnimator'
import AesKeyExpansionVisualizer from '../../../components/symmetric/AesKeyExpansionVisualizer'
import IdeaCipherVisualizer from '../../../components/symmetric/IdeaCipherVisualizer'
import DHMitMVisualizer from '../../../components/attacks/DHMitMVisualizer'

// ---------------------------------------------------------------------------
// 1. PlayfairGrid — matrix visualizer contract
// ---------------------------------------------------------------------------

describe('PlayfairGrid — matrix visualizer contract', () => {
  testMatrixVisualizerContract(PlayfairGrid, PLAYFAIR_MATRIX_STR, {
    highlightPropName: 'highlights',
  })
})

describe('PlayfairGrid — 2D matrix variant', () => {
  testMatrixVisualizerContract(PlayfairGrid, PLAYFAIR_MATRIX_2D, {
    highlightPropName: 'highlights',
  })
})

// ---------------------------------------------------------------------------
// 2. RailFenceViz — matrix visualizer contract (highlight singular)
// ---------------------------------------------------------------------------

describe('RailFenceViz — matrix visualizer contract', () => {
  testMatrixVisualizerContract(RailFenceViz, RAIL_FENCE_MATRIX, {
    highlightPropName: 'highlight',
    // RailFenceViz matrix prop is string[][] only — skip the string edge case
    allowStringMatrix: false,
  })
})

// ---------------------------------------------------------------------------
// 3. DHVisualizer — currentStep-driven (0–9, no CipherResult)
// ---------------------------------------------------------------------------

describe('DHVisualizer', () => {
  // DHVisualizer takes only `currentStep: number`.
  // We pass a single "dummy" step for the harness steps array
  // but rely on extraProps to drive the actual prop.
  // We use the currentStep sweep (stepCountForCurrentStep=9).
  testVisualizerContract(
    DHVisualizer,
    // mockSteps is unused internally for this component; we need it non-empty
    // so the "every step index" loop runs at least once.
    [makeStep(0)],
    {
      extraProps: { currentStep: 0 },
      usesResultSteps: false,
      stepCountForCurrentStep: 9,
    },
  )
})

// ---------------------------------------------------------------------------
// 4. HmacVisualizer — CipherResult-steps, exactly 5 steps required
// ---------------------------------------------------------------------------

// HMAC visualizer accesses steps[0..4] directly at the top level, so we must
// provide exactly 5 steps in MOCK_RESULT.
const HMAC_MOCK_STEPS = [
  makeStep(0, { label: 'Key Preparation', inputState: 'aabbccdd', outputState: 'aabbccdd' + '00'.repeat(44) }),
  makeStep(1, { label: "Inner Key (K' XOR ipad)", outputState: '3d'.repeat(64) }),
  makeStep(2, { label: 'Inner SHA-256 Hash', outputState: 'cafe'.repeat(16) }),
  makeStep(3, { label: "Outer Key (K' XOR opad)", outputState: '57'.repeat(64) }),
  makeStep(4, { label: 'Outer SHA-256 Hash (Final HMAC)', outputState: 'deadbeef'.repeat(8) }),
]

describe('HmacVisualizer', () => {
  testVisualizerContract(HmacVisualizer, HMAC_MOCK_STEPS, {
    usesResultSteps: true,
  })
})

// ---------------------------------------------------------------------------
// 5. Sm3Visualizer — CipherResult-steps (72 steps: 0–71)
// ---------------------------------------------------------------------------

const SM3_MOCK_STEPS = makeSteps(72, {
  table: [
    { key: 'A', value: 'aa' },
    { key: 'B', value: 'bb' },
    { key: 'E', value: 'ee' },
    { key: 'SS1', value: '11' },
    { key: 'SS2', value: '22' },
    { key: 'TT1 (new A)', value: '33' },
    { key: 'P0(TT2) (new E)', value: '44' },
  ],
})

describe('Sm3Visualizer', () => {
  testVisualizerContract(Sm3Visualizer, SM3_MOCK_STEPS, {
    usesResultSteps: true,
  })
})

// ---------------------------------------------------------------------------
// 6. StepAnimator — steps-array + onStepChange
// ---------------------------------------------------------------------------

describe('StepAnimator', () => {
  const STEP_ANIMATOR_STEPS = makeSteps(5)

  testVisualizerContract(StepAnimator, STEP_ANIMATOR_STEPS, {
    extraProps: {
      steps: STEP_ANIMATOR_STEPS,
      currentStep: 0,
      onStepChange: vi.fn(),
    },
    usesResultSteps: false,
    // StepAnimator renders its own interactive controls with proper aria-labels.
    // We skip the generic highlight prop tests since it doesn't use them.
    skipA11y: false,
  })
})

// ---------------------------------------------------------------------------
// 7. Additional core visualizers — render-smoke + DOM measurement
//    (self-contained components with no step props)
// ---------------------------------------------------------------------------

describe('AesKeyExpansionVisualizer — render smoke test', () => {
  it('mounts without throwing', () => {
    installDomMeasurementStubs()
    expect(() => render(React.createElement(AesKeyExpansionVisualizer))).not.toThrow()
  })

  it('renders a DOM element', () => {
    const { container } = render(React.createElement(AesKeyExpansionVisualizer))
    expect(container.firstChild).not.toBeNull()
  })
})

describe('IdeaCipherVisualizer — render smoke test', () => {
  it('mounts without throwing', () => {
    installDomMeasurementStubs()
    expect(() => render(React.createElement(IdeaCipherVisualizer))).not.toThrow()
  })

  it('renders a DOM element', () => {
    const { container } = render(React.createElement(IdeaCipherVisualizer))
    expect(container.firstChild).not.toBeNull()
  })
})

describe('DHMitMVisualizer — render smoke test', () => {
  it('mounts without throwing', () => {
    installDomMeasurementStubs()
    expect(() => render(React.createElement(DHMitMVisualizer))).not.toThrow()
  })

  it('renders a DOM element', () => {
    const { container } = render(React.createElement(DHMitMVisualizer))
    expect(container.firstChild).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 8. Cross-cutting: StepAnimator specific isMilestone flag
// ---------------------------------------------------------------------------

describe('StepAnimator — isMilestone badge', () => {
  it('renders the Milestone badge when a step has isMilestone=true', () => {
    const steps = [
      makeStep(0, { isMilestone: true }),
      makeStep(1),
    ]
    const { getByText } = render(
      React.createElement(StepAnimator, {
        steps,
        currentStep: 0,
        onStepChange: vi.fn(),
      }),
    )
    expect(getByText('Milestone')).toBeTruthy()
  })

  it('does not render the Milestone badge when isMilestone is false', () => {
    const steps = [makeStep(0, { isMilestone: false })]
    const { queryByText } = render(
      React.createElement(StepAnimator, {
        steps,
        currentStep: 0,
        onStepChange: vi.fn(),
      }),
    )
    expect(queryByText('Milestone')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// 9. PlayfairGrid — specific ARIA contract (supplements matrix harness)
// ---------------------------------------------------------------------------

describe('PlayfairGrid — ARIA contract', () => {
  it('grid role has accessible label', () => {
    const { container } = render(
      React.createElement(PlayfairGrid, { matrix: PLAYFAIR_MATRIX_STR }),
    )
    const grid = container.querySelector('[role="grid"]')
    expect(grid).not.toBeNull()
    expect(grid!.getAttribute('aria-label')).toBeTruthy()
  })

  it('each gridcell aria-label includes row, column, and char', () => {
    const { container } = render(
      React.createElement(PlayfairGrid, { matrix: PLAYFAIR_MATRIX_STR }),
    )
    const cells = container.querySelectorAll('[role="gridcell"]')
    expect(cells.length).toBe(25)
    cells.forEach((cell) => {
      const label = cell.getAttribute('aria-label') ?? ''
      expect(label).toMatch(/Row \d+, column \d+:/)
    })
  })
})

// ---------------------------------------------------------------------------
// 10. HmacVisualizer — null / empty result edge cases
// ---------------------------------------------------------------------------

describe('HmacVisualizer — null result edge cases', () => {
  it('renders nothing (null) when result prop is null', () => {
    const { container } = render(
      React.createElement(HmacVisualizer, { currentStep: 0, result: null }),
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing (null) when result.steps is empty', () => {
    const { container } = render(
      React.createElement(HmacVisualizer, {
        currentStep: 0,
        result: makeResult([]),
      }),
    )
    expect(container).toBeEmptyDOMElement()
  })
})

// ---------------------------------------------------------------------------
// 11. Sm3Visualizer — null / empty result edge cases
// ---------------------------------------------------------------------------

describe('Sm3Visualizer — null result edge cases', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(
      React.createElement(Sm3Visualizer, { currentStep: 0, result: null }),
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when result.steps is empty', () => {
    const { container } = render(
      React.createElement(Sm3Visualizer, {
        currentStep: 0,
        result: makeResult([]),
      }),
    )
    expect(container).toBeEmptyDOMElement()
  })
})
