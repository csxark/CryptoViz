export interface CipherInput {
  text: string;
  key: string;
  iv?: string;
  aad?: string;
  mode?: string;
  padding?: boolean;
  options?: Record<string, any>;
}

export interface CipherOutput {
  ciphertext: string;
  plaintext?: string;
  tag?: string;
  stepTrace?: Array<{
    step: number;
    title: string;
    description: string;
    state: string;
  }>;
  executionTimeMs?: number;
}

export interface KnownAnswerTestVector {
  id?: string;
  name?: string;
  variant?: string;
  source?: string;
  keyHex: string;
  plaintextHex: string;
  ciphertextHex: string;
  ivHex?: string;
  aadHex?: string;
  tagHex?: string;
  notes?: string;
}

export interface ICipherPlugin {
  id: string;
  name: string;
  category: 'classical' | 'symmetric' | 'asymmetric' | 'hash' | 'pqc';
  capabilities: {
    supportsEncryption: boolean;
    supportsDecryption: boolean;
    supportsAEAD: boolean;
    supportsStepTrace: boolean;
    validKeyLengths: number[];
    validIvLengths?: number[];
  };
  execute(input: CipherInput): Promise<CipherOutput>;
  getTestVectors(): KnownAnswerTestVector[];
}