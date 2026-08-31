import { describe, it, expect } from 'vitest';
import {
  executeStage,
  executePipeline,
  executePipelineSync,
  exportPipelineToJson,
  importPipelineFromJson,
  createPipelineStage,
  isStandaloneStage,
  getPipelineAlgorithms,
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

  it('executes Hex encoding and decoding correctly', () => {
    const stageEncode: PipelineStage = {
      id: 'h1',
      category: 'encode',
      cipherId: 'hex-encode',
      name: 'Hex Encode',
      params: {},
      inputType: 'utf8-text',
      outputType: 'hex-string',
    };
    const stageDecode: PipelineStage = {
      id: 'h2',
      category: 'decode',
      cipherId: 'hex-decode',
      name: 'Hex Decode',
      params: {},
      inputType: 'hex-string',
      outputType: 'utf8-text',
    };

    const hex = executeStage('CryptoViz', stageEncode);
    expect(hex).toBe('43727970746f56697a');

    const text = executeStage(hex, stageDecode);
    expect(text).toBe('CryptoViz');
  });

  it('executes Caesar encryption and decryption correctly', () => {
    const stageEnc: PipelineStage = {
      id: 'c1',
      category: 'encrypt',
      cipherId: 'caesar',
      name: 'Caesar Encrypt',
      params: { shift: '3' },
      inputType: 'utf8-text',
      outputType: 'utf8-text',
    };
    const stageDec: PipelineStage = {
      id: 'c2',
      category: 'encrypt',
      cipherId: 'caesar-decrypt',
      name: 'Caesar Decrypt',
      params: { shift: '3' },
      inputType: 'utf8-text',
      outputType: 'utf8-text',
    };

    const encrypted = executeStage('abc', stageEnc);
    expect(encrypted).toBe('def');

    const decrypted = executeStage(encrypted, stageDec);
    expect(decrypted).toBe('abc');
  });

  it('executes Atbash and ROT13 transforms correctly', () => {
    const stageRot13: PipelineStage = {
      id: 'r1',
      category: 'encrypt',
      cipherId: 'rot13',
      name: 'ROT13',
      params: {},
      inputType: 'utf8-text',
      outputType: 'utf8-text',
    };
    const stageAtbash: PipelineStage = {
      id: 'a1',
      category: 'encrypt',
      cipherId: 'atbash',
      name: 'Atbash',
      params: {},
      inputType: 'utf8-text',
      outputType: 'utf8-text',
    };

    expect(executeStage('Hello', stageRot13)).toBe('Uuryb');
    expect(executeStage('Hello', stageAtbash)).toBe('Svool');
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

  it('executes executePipelineSync() across stages', () => {
    const stages: PipelineStage[] = [
      { id: 'p1', category: 'encode', cipherId: 'base64-encode', name: 'Stage 1', params: {}, inputType: 'utf8-text', outputType: 'base64-string' },
      { id: 'p2', category: 'encrypt', cipherId: 'rot13', name: 'Stage 2', params: {}, inputType: 'utf8-text', outputType: 'utf8-text' },
    ];

    const output = executePipelineSync('Crypto', stages);
    expect(output).toBe(executeStage(executeStage('Crypto', stages[0]), stages[1]));
  });

  it('executes all PIPELINE_PRESETS without throwing unhandled exceptions', async () => {
    for (const preset of PIPELINE_PRESETS) {
      const stages: PipelineStage[] = preset.stages.map((stg, i) => ({
        ...stg,
        id: `preset-stage-${i}`,
      }));

      const result = await executePipeline('PresetPayloadTest123', stages);
      expect(result.success).toBe(true);
      expect(result.stageResults.length).toBe(preset.stages.length);
      expect(result.finalOutput).toBeDefined();
    }
  });

  it('creates stages correctly for both registered ciphers and standalone encoders', () => {
    const aesStage = createPipelineStage('aes', 0);
    expect(aesStage.cipherId).toBe('aes');

    const base64Stage = createPipelineStage('base64-encode', 1);
    expect(base64Stage.cipherId).toBe('base64-encode');
    expect(base64Stage.category).toBe('encode');

    const hexStage = createPipelineStage('hex-decode', 2);
    expect(hexStage.cipherId).toBe('hex-decode');
    expect(hexStage.category).toBe('decode');
  });

  it('identifies standalone stages correctly', () => {
    expect(isStandaloneStage('base64-encode')).toBe(true);
    expect(isStandaloneStage('base64-decode')).toBe(true);
    expect(isStandaloneStage('hex-encode')).toBe(true);
    expect(isStandaloneStage('hex-decode')).toBe(true);
    expect(isStandaloneStage('aes')).toBe(false);
  });

  it('exports and imports pipeline JSON correctly', () => {
    const originalStages: PipelineStage[] = [
      { id: '1', category: 'encode', cipherId: 'hex-encode', name: 'Hex', params: {}, inputType: 'utf8-text', outputType: 'hex-string' },
      { id: '2', category: 'encrypt', cipherId: 'caesar', name: 'Caesar', params: { shift: '5' }, inputType: 'utf8-text', outputType: 'utf8-text' },
    ];

    const jsonStr = exportPipelineToJson(originalStages);
    expect(jsonStr).toContain('hex-encode');
    expect(jsonStr).toContain('caesar');

    const imported = importPipelineFromJson(jsonStr);
    expect(imported.length).toBe(2);
    expect(imported[0].cipherId).toBe('hex-encode');
    expect(imported[1].params.shift).toBe('5');
  });

  it('throws error when creating an unknown non-standalone stage', () => {
    expect(() => createPipelineStage('completely-unknown-cipher-xyz')).toThrow(/Unknown cipher/);
  });

  it('retrieves pipeline algorithms list', () => {
    const algos = getPipelineAlgorithms();
    expect(algos.length).toBeGreaterThan(0);
  });
});

