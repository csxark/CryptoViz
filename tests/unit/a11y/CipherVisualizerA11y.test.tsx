import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, act } from '@testing-library/react'
import { axe } from 'jest-axe'
import StepAnimator from '../../../components/cipher/StepAnimator'
import type { CipherStep } from '../../../lib/cipher/types'

// Setup robust test data with various edge cases and sizes
const generateSteps = (count: number): CipherStep[] => {
  return Array.from({ length: count }, (_, i) => ({
    label: `Step ${i + 1}`,
    note: `Detailed description for step ${i + 1}`,
    isMilestone: i % 2 === 0,
    inputState: i > 0 ? `Input for step ${i + 1}` : undefined,
    outputState: `Output for step ${i + 1}`,
    matrix: [['1', '2'], ['3', '4']],
    table: [
      { key: 'Key1', value: `Val1-${i}` },
      { key: 'Key2', value: `Val2-${i}` }
    ]
  }));
};

describe('CipherVisualizerBoard StepAnimator A11y Suite', () => {
  const steps = generateSteps(10);
  
  it('renders without accessibility violations initially', async () => {
    const { container } = render(
      <StepAnimator 
        steps={steps} 
        currentStep={0} 
        onStepChange={vi.fn()} 
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('exposes the active step readout container as an aria-live region (Issue #1733 Fix)', () => {
    render(
      <StepAnimator 
        steps={steps} 
        currentStep={0} 
        onStepChange={vi.fn()} 
      />
    );
    
    // Check if aria-live is present on the container that holds the label
    const liveRegion = screen.getAllByText('Step 1')[0].closest('div[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('updates screen reader readout when step changes', () => {
    const { rerender } = render(
      <StepAnimator 
        steps={steps} 
        currentStep={0} 
        onStepChange={vi.fn()} 
      />
    );
    
    expect(screen.getAllByText('Step 1')[0]).toBeInTheDocument();
    
    // Step forward
    rerender(
      <StepAnimator 
        steps={steps} 
        currentStep={1} 
        onStepChange={vi.fn()} 
      />
    );
    
    // Check updated label in aria-live container
    const liveRegion = screen.getAllByText('Step 2')[0].closest('div[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it('navigates cleanly through all milestone phases', () => {
    const onStepChange = vi.fn();
    render(
      <StepAnimator 
        steps={steps} 
        currentStep={0} 
        onStepChange={onStepChange} 
      />
    );
    
    // Press Next Phase shortcut Shift+ArrowRight
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true });
    expect(onStepChange).toHaveBeenCalledWith(2); // Milestone at index 2
  });
  
  it('does not produce violations in high-contrast play state', async () => {
    const { container, rerender } = render(
      <StepAnimator 
        steps={steps} 
        currentStep={0} 
        onStepChange={vi.fn()} 
      />
    );
    
    fireEvent.click(screen.getByRole('button', { name: /play animation/i }));
    
    // Validate accessibility in the new state
    expect(await axe(container)).toHaveNoViolations();
  });
  
  it('correctly associates timeline slider with active step', () => {
    render(
      <StepAnimator 
        steps={steps} 
        currentStep={5} 
        onStepChange={vi.fn()} 
      />
    );
    
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    expect(slider).toHaveAttribute('aria-valuetext', 'Step 6 of 10: Step 6');
  });
});
