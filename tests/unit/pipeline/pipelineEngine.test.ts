import { describe, it, expect } from 'vitest';
import {
  executeStage,
  executePipeline,
  exportPipelineToJson,
  importPipelineFromJson,
  PipelineStage,
  PIPELINE_PRESETS,
} from '../../../lib/pipeline/pipelineEngine';

describe('Cipher Pipeline Engine', () => {
  it('executes Base64 encoding and decoding correctly', () => {
    const stageEncode: PipelineStage = {
      id: '1',
      category: 'encode',
      cipherId: 'base64-encode',
      name: 'Base64',
      params: {},
      inputType: 'utf8-text',
      outputType: 'base64-string',
    };
    const stageDecode: PipelineStage = {
      id: '2',
      category: 'decode',
      cipherId: 'base64-decode',
      name: 'Base64 Dec',
      params: {},
      inputType: 'base64-string',
      outputType: 'utf8-text',
    };

    const encoded = executeStage('Hello World', stageEncode);
    expect(encoded).toBe('SGVsbG8gV29ybGQ=');

    const decoded = executeStage(encoded, stageDecode);
    expect(decoded).toBe('Hello World');
  });

  it('executes Caesar encryption and decryption correctly', () => {
    const stage: PipelineStage = {
      id: 'c1',
      category: 'encrypt',
      cipherId: 'caesar',
      name: 'Caesar',
      params: { shift: '3' },
      inputType: 'utf8-text',
      outputType: 'utf8-text',
    };
    expect(executeStage('abc', stage)).toBe('def');
  });

  it('chains multi-stage execution with executePipeline()', async () => {
    const stages: PipelineStage[] = [
      { id: 's1', category: 'encode', cipherId: 'base64-encode', name: 'Stage 1', params: {}, inputType: 'utf8-text', outputType: 'base64-string' },
      { id: 's2', category: 'encrypt', cipherId: 'caesar', name: 'Stage 2', params: { shift: '1' }, inputType: 'utf8-text', outputType: 'utf8-text' },
      { id: 's3', category: 'hash', cipherId: 'sha256', name: 'Stage 3', params: {}, inputType: 'utf8-text', outputType: 'hex-string' },
    ];

    const result = await executePipeline('TestPayload', stages);
    expect(result.success).toBe(true);
    expect(result.stageResults.length).toBe(3);
    expect(result.finalOutput.length).toBe(64);
  });

  it('exports and imports pipeline JSON correctly', () => {
    const originalStages: PipelineStage[] = [
      { id: '1', category: 'encode', cipherId: 'hex-encode', name: 'Hex', params: {}, inputType: 'utf8-text', outputType: 'hex-string' },
    ];

    const jsonStr = exportPipelineToJson(originalStages);
    expect(jsonStr).toContain('hex-encode');

    const imported = importPipelineFromJson(jsonStr);
    expect(imported.length).toBe(1);
    expect(imported[0].cipherId).toBe('hex-encode');
  });

  it('has built-in pipeline presets', () => {
    expect(PIPELINE_PRESETS.length).toBeGreaterThanOrEqual(3);
  });
});
