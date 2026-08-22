export type CipherType = 'AES' | 'RSA' | 'ChaCha20' | 'ECC';

export interface ExecuteCipherRequest {
  readonly type: 'EXECUTE_CIPHER';
  readonly jobId: string;
  readonly algorithm: CipherType;
  readonly payload: string;
  readonly key: string;
  readonly version: number; // Protocol versioning field
}

export interface CancelJobRequest {
  readonly type: 'CANCEL_JOB';
  readonly jobId: string;
  readonly version: number;
}

export type WorkerRequest = ExecuteCipherRequest | CancelJobRequest;

export interface CipherSuccessResponse {
  readonly type: 'CIPHER_SUCCESS';
  readonly jobId: string;
  readonly result: string;
  readonly timings: {
    readonly startTime: number;
    readonly endTime: number;
    readonly durationMs: number;
  };
  readonly version: number;
}

export interface CipherFailureResponse {
  readonly type: 'CIPHER_FAILURE';
  readonly jobId: string;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
  readonly version: number;
}

export interface ProgressResponse {
  readonly type: 'PROGRESS_UPDATE';
  readonly jobId: string;
  readonly progressPercentage: number;
  readonly statusMessage: string;
  readonly version: number;
}

export type WorkerResponse =
  | CipherSuccessResponse
  | CipherFailureResponse
  | ProgressResponse;

export const CURRENT_PROTOCOL_VERSION = 1;
