import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { axe } from 'jest-axe'
import StepAnimator from '../../../components/cipher/StepAnimator'
import type { CipherStep } from '../../../lib/cipher/types'

const sampleSteps: CipherStep[] = [
  { index: 0, label: 'Key setup', inputState: '', outputState: '', note: 'Initial step' },
  { index: 1, label: 'Round 1', inputState: 'a1', outputState: 'b2', note: 'First transform' },
  { index: 2, label: 'Round 2', inputState: 'b2', outputState: 'c3', note: 'Final transform' },
]

describe('StepAnimator accessibility', () => {
  it('has no axe-core violations at step 0', async () => {
    const { container } = render(
      <StepAnimator steps={sampleSteps} currentStep={0} onStepChange={() => {}} />
    )
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe-core violations after starting playback', async () => {
    const { container } = render(
      <StepAnimator steps={sampleSteps} currentStep={1} onStepChange={() => {}} />
    )
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('sets correct ARIA attributes on the scrub slider', () => {
    render(<StepAnimator steps={sampleSteps} currentStep={1} onStepChange={() => {}} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', String(sampleSteps.length - 1))
    expect(slider).toHaveAttribute('aria-valuenow', '1')
  })

  it('play/pause button exposes a dynamic accessible name', () => {
    render(<StepAnimator steps={sampleSteps} currentStep={0} onStepChange={() => {}} />)
    const button = screen.getByRole('button', { name: /play/i })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })
})
