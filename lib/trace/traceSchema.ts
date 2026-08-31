/**
 * Versioned Common Trace Schema for Cryptographic Algorithm Execution
 * Enables consistent step-by-step visualization across all supported algorithms
 */

/**
 * Execution phase in algorithm lifecycle
 */
export type ExecutionPhase = 
  | 'initialization'
  | 'key_schedule'
  | 'preprocessing'
  | 'main_round'
  | 'finalization'
  | 'complete';

/**
 * Describes a single execution state of an algorithm
 */
export interface TraceStep {
  /** Unique step identifier within trace */
  stepIndex: number;

  /** Current execution phase */
  phase: ExecutionPhase;

  /** Input state snapshot (serializable) */
  input: Record<string, unknown>;

  /** Transformation applied in this step */
  transformation: {
    /** Name of operation (e.g., "SubBytes", "MixColumns") */
    name: string;
    /** Human-readable description */
    description: string;
    /** Specific parameters for this transformation */
    parameters?: Record<string, unknown>;
  };

  /** Output/result of transformation */
  output: Record<string, unknown>;

  /** Optional explanation for UI display */
  explanation?: string;

  /** Execution time in milliseconds */
  executionTimeMs?: number;

  /** Metadata for visualization hints */
  metadata?: {
    highlighted?: string[];
    emphasized?: string[];
    dataFlow?: Array<{ from: string; to: string }>;
  };
}

/**
 * Terminal state of algorithm execution
 */
export interface TerminalState {
  /** Final output/result */
  result: Record<string, unknown>;

  /** Whether execution completed successfully */
  success: boolean;

  /** Error message if execution failed */
  error?: string;

  /** Total execution time in milliseconds */
  totalTimeMs: number;

  /** Digest/summary of final state */
  digest?: string;
}

/**
 * Complete execution trace for a cryptographic algorithm
 * Version: 1.0
 */
export interface AlgorithmTrace {
  /** Schema version for compatibility */
  schemaVersion: '1.0';

  /** Unique trace identifier */
  traceId: string;

  /** Algorithm identifier (e.g., "aes", "sha256") */
  algorithmId: string;

  /** Algorithm version/variant (e.g., "128", "256") */
  algorithmVersion: string;

  /** Timestamp when trace was created */
  timestamp: number;

  /** Initial input configuration */
  initialConfig: {
    plaintext?: string;
    key?: string;
    nonce?: string;
    [key: string]: unknown;
  };

  /** Ordered list of execution steps */
  steps: TraceStep[];

  /** Final execution state */
  terminal: TerminalState;

  /** Optional custom metadata */
  customMetadata?: Record<string, unknown>;
}

/**
 * Validated trace state
 */
export interface ValidatedTrace extends AlgorithmTrace {
  isValid: true;
  validationWarnings?: string[];
}

/**
 * Invalid trace result
 */
export interface InvalidTrace {
  isValid: false;
  errors: string[];
  traceId?: string;
  algorithmId?: string;
}