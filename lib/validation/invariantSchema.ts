/**
 * Invariant Validation Schema for Cryptographic Algorithm States
 * Defines the structure for checking algorithm-specific constraints
 */

/**
 * Result of a single invariant check
 */
export interface InvariantCheckResult {
  /** Invariant name/identifier */
  invariantName: string;

  /** Whether check passed */
  passed: boolean;

  /** Error message if check failed */
  error?: string;

  /** Relevant state data that failed */
  failedState?: Record<string, unknown>;

  /** Expected constraint that was violated */
  expectedConstraint?: string;

  /** Step/round where failure occurred */
  stepIndex?: number;

  /** Phase where failure occurred */
  phase?: string;
}

/**
 * Complete validation result for a trace or step
 */
export interface ValidationResult {
  /** Overall pass/fail */
  isValid: boolean;

  /** Individual invariant check results */
  checks: InvariantCheckResult[];

  /** Summary of failures */
  failedInvariants: string[];

  /** Total checks performed */
  totalChecks: number;

  /** Timestamp of validation */
  timestamp: number;
}

/**
 * Algorithm-specific invariant validator interface
 */
export interface AlgorithmInvariantValidator {
  /** Algorithm identifier (e.g., "aes", "sha256") */
  algorithmId: string;

  /** Validator name */
  name: string;

  /** Check state at a specific step */
  validateStep(
    stepIndex: number,
    state: Record<string, unknown>,
    context?: Record<string, unknown>
  ): InvariantCheckResult[];

  /** Check complete trace */
  validateTrace(
    trace: { steps: Array<{ stepIndex: number; output: Record<string, unknown> }> },
    context?: Record<string, unknown>
  ): ValidationResult;

  /** Get list of supported invariants */
  getInvariants(): string[];
}

/**
 * Configuration for validation behavior
 */
export interface ValidationConfig {
  /** Enable validation (default: true in dev, false in production) */
  enabled: boolean;

  /** Fail fast on first error (default: false - check all invariants) */
  failFast?: boolean;

  /** Log validation results to console (default: true in dev) */
  verbose?: boolean;

  /** Invariants to check (null = all) */
  invariantsToCheck?: string[];

  /** Throw error on validation failure */
  throwOnError?: boolean;
}

/**
 * Validation error with trace context
 */
export class InvariantValidationError extends Error {
  constructor(
    public algorithmId: string,
    public stepIndex: number,
    public invariantName: string,
    message: string,
    public failedState?: Record<string, unknown>,
    public expectedConstraint?: string
  ) {
    super(
      `Invariant "${invariantName}" failed at step ${stepIndex} in ${algorithmId}: ${message}`
    );
    this.name = 'InvariantValidationError';
  }
}