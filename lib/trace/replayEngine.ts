/**
 * Generic Replay Engine for Cryptographic Algorithm Traces
 * Supports navigation, validation, and speed-controlled playback
 */

import type { AlgorithmTrace, TraceStep } from './traceSchema';
import { getValidationEngine } from '../validation';
export interface ReplayPosition {
  stepIndex: number;
  phase: string;
  timestamp: number;
}

export interface ReplayState {
  trace: AlgorithmTrace;
  currentPosition: ReplayPosition;
  isPlaying: boolean;
  playbackSpeed: number; // 1.0 = normal, 0.5 = half speed, 2.0 = double
}

/**
 * Generic replay engine for any algorithm trace
 */
export class UnifiedReplayEngine {
  private state: ReplayState;

  constructor(trace: AlgorithmTrace) {
    this.state = {
      trace,
      currentPosition: {
        stepIndex: -1,
        phase: 'initialization',
        timestamp: Date.now(),
      },
      isPlaying: false,
      playbackSpeed: 1.0,
    };
  }

  /**
   * Move to next step
   * @returns True if advanced, false if at end
   */
  public stepForward(): boolean {
    if (this.state.currentPosition.stepIndex >= this.state.trace.steps.length - 1) {
      return false;
    }

    this.state.currentPosition.stepIndex++;
    this.state.currentPosition.timestamp = Date.now();
    return true;
  }

  /**
   * Move to previous step
   * @returns True if moved back, false if at start
   */
  public stepBackward(): boolean {
    if (this.state.currentPosition.stepIndex <= -1) {
      return false;
    }

    this.state.currentPosition.stepIndex--;
    this.state.currentPosition.timestamp = Date.now();
    return true;
  }

  /**
   * Jump directly to specific step
   * @param stepIndex Target step (0-based)
   * @returns True if jump succeeded, false if out of bounds
   */
  public jumpToStep(stepIndex: number): boolean {
    if (stepIndex < -1 || stepIndex >= this.state.trace.steps.length) {
      return false;
    }

    this.state.currentPosition.stepIndex = stepIndex;
    this.state.currentPosition.timestamp = Date.now();
    return true;
  }

  /**
   * Jump to specific phase
   * @param phase Phase name
   * @returns True if phase found, false otherwise
   */
  public jumpToPhase(phase: string): boolean {
    const phaseSteps = this.state.trace.steps.filter(s => s.phase === phase);
    if (phaseSteps.length === 0) return false;

    const firstIndex = this.state.trace.steps.indexOf(phaseSteps[0]);
    return this.jumpToStep(firstIndex);
  }

  /**
   * Get current step with validation
   */
  public getCurrentStep(): TraceStep | null {
    const idx = this.state.currentPosition.stepIndex;
    if (idx < 0 || idx >= this.state.trace.steps.length) return null;

    const step = this.state.trace.steps[idx];

    // Validate step invariants
    const validator = getValidationEngine();
    if (validator.hasValidator(this.state.trace.algorithmId)) {
      validator.validateStep(
        this.state.trace.algorithmId,
        step.stepIndex,
        step.output
      );
    }

    return step;
  }
  /**
   * Set playback speed
   * @param speed Multiplier (0.25, 0.5, 1.0, 2.0, etc.)
   */
  public setPlaybackSpeed(speed: number): void {
    if (speed > 0) {
      this.state.playbackSpeed = speed;
    }
  }

  /**
   * Start playback
   */
  public play(): void {
    this.state.isPlaying = true;
  }

  /**
   * Pause playback
   */
  public pause(): void {
    this.state.isPlaying = false;
  }

  /**
   * Reset to beginning
   */
  public reset(): void {
    this.state.currentPosition.stepIndex = -1;
    this.state.isPlaying = false;
    this.state.currentPosition.timestamp = Date.now();
  }

  /**
   * Get replay state
   */
  public getState(): ReplayState {
    return { ...this.state };
  }

  /**
   * Get trace statistics
   */
  public getStats(): {
    totalSteps: number;
    currentStep: number;
    progress: number; // 0-100
    phases: string[];
  } {
    const total = this.state.trace.steps.length;
    const current = this.state.currentPosition.stepIndex + 1;
    const phases = [...new Set(this.state.trace.steps.map(s => s.phase))];

    return {
      totalSteps: total,
      currentStep: current,
      progress: total > 0 ? (current / total) * 100 : 0,
      phases,
    };
  }

  /**
   * Validate trace integrity including invariants
   */
  public validateTrace(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check steps are ordered
    for (let i = 0; i < this.state.trace.steps.length; i++) {
      if (this.state.trace.steps[i].stepIndex !== i) {
        errors.push(`Step index mismatch at position ${i}`);
      }
    }

    // Check terminal state exists
    if (!this.state.trace.terminal) {
      errors.push('Missing terminal state');
    }

    // Validate cryptographic invariants
    const validator = getValidationEngine();
    if (validator.hasValidator(this.state.trace.algorithmId)) {
      const result = validator.validateTrace(
        this.state.trace.algorithmId,
        this.state.trace,
        this.state.trace.customMetadata
      );

      if (!result.isValid) {
        errors.push(
          `Invariant validation failed: ${result.failedInvariants.join(', ')}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }}