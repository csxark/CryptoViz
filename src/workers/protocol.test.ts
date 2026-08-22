import {
  WorkerRequest,
  WorkerResponse,
  CURRENT_PROTOCOL_VERSION
} from './protocol';

describe('Worker Protocol Contract Validation', () => {
  it('should validate request discriminated types and protocol version', () => {
    const request: WorkerRequest = {
      type: 'EXECUTE_CIPHER',
      jobId: 'job-123',
      algorithm: 'AES',
      payload: 'secret-data',
      key: 'encryption-key',
      version: CURRENT_PROTOCOL_VERSION
    };

    expect(request.type).toBe('EXECUTE_CIPHER');
    expect(request.version).toBe(CURRENT_PROTOCOL_VERSION);
  });

  it('should validate structured error responses and discriminated types', () => {
    const response: WorkerResponse = {
      type: 'CIPHER_FAILURE',
      jobId: 'job-123',
      error: {
        code: 'ERR_INVALID_KEY',
        message: 'The encryption key length is invalid.'
      },
      version: CURRENT_PROTOCOL_VERSION
    };

    expect(response.type).toBe('CIPHER_FAILURE');
    if (response.type === 'CIPHER_FAILURE') {
      expect(response.error.code).toBeDefined();
      expect(response.error.message).toBeDefined();
    }
  });

  it('should validate progress update contracts', () => {
    const progress: WorkerResponse = {
      type: 'PROGRESS_UPDATE',
      jobId: 'job-123',
      progressPercentage: 50,
      statusMessage: 'Processing blocks...',
      version: CURRENT_PROTOCOL_VERSION
    };

    expect(progress.type).toBe('PROGRESS_UPDATE');
    if (progress.type === 'PROGRESS_UPDATE') {
      expect(progress.progressPercentage).toBe(50);
    }
  });
});
