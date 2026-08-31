/**
 * Common Test Vector Format for Cryptographic Algorithm Conformance Testing
 * Supports intermediate and final state validation
 */

/**
 * Single test case with inputs, expected outputs, and optional intermediate states
 */
export interface TestVector {
  /** Test case identifier/description */
  testId: string;
  
  /** Algorithm inputs */
  inputs: {
    plaintext?: string;
    ciphertext?: string;
    key: string;
    iv?: string;
    nonce?: string;
    message?: string;
    password?: string;
    salt?: string;
    [key: string]: string | undefined;
  };
  
  /** Expected final output */
  expectedOutput: {
    ciphertext?: string;
    plaintext?: string;
    digest?: string;
    hash?: string;
    [key: string]: string | undefined;
  };
  
  /** Optional intermediate states for step-by-step validation */
  intermediateStates?: {
    /** Round number or phase identifier */
    step: number | string;
    /** State value at this step (hex string) */
    state: Record<string, string>;
  }[];
  
  /** Metadata about this vector */
  metadata?: {
    source?: string;  // NIST, IETF, RFC reference
    description?: string;
    keySize?: number;
    blockSize?: number;
    rounds?: number;
  };
}

/**
 * Collection of test vectors for a single algorithm
 */
export interface TestVectorSet {
  /** Algorithm identifier (e.g., "aes", "sha256") */
  algorithm: string;
  
  /** Algorithm variant/version */
  variant: string;
  
  /** Schema version for format compatibility */
  schemaVersion: '1.0';
  
  /** Array of test vectors */
  vectors: TestVector[];
  
  /** Metadata about this test set */
  metadata?: {
    source?: string;
    releaseDate?: string;
    conformanceTarget?: string;  // e.g., "FIPS 197", "RFC 3394"
  };
}

/**
 * Result of conformance test execution
 */
export interface ConformanceTestResult {
  /** Test identifier */
  testId: string;
  
  /** Whether test passed */
  passed: boolean;
  
  /** Error message if failed */
  error?: string;
  
  /** Which field(s) failed (e.g., "ciphertext", "step-5-state")  */
  failedField?: string;
  
  /** Expected value */
  expected?: string;
  
  /** Actual value */
  actual?: string;
  
  /** Execution time in milliseconds */
  executionTimeMs?: number;
}

/**
 * Summary of conformance test run
 */
export interface ConformanceSummary {
  /** Algorithm tested */
  algorithm: string;
  
  /** Variant tested */
  variant: string;
  
  /** Total test vectors */
  totalTests: number;
  
  /** Passed tests */
  passedTests: number;
  
  /** Failed tests */
  failedTests: number;
  
  /** Detailed results */
  results: ConformanceTestResult[];
  
  /** Timestamp */
  timestamp: number;
  
  /** Total execution time */
  totalTimeMs: number;
}