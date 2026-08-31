/**
 * Unit tests for CryptoSonifier — Issue #1069
 * Web Audio API is mocked since jsdom does not implement it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoSonifier } from '@/lib/accessibility/sonifier';

// ── Web Audio API Mocks ───────────────────────────────────────────────────────

const mockOscillatorStart      = vi.fn();
const mockOscillatorStop       = vi.fn();
const mockOscillatorConnect    = vi.fn();
const mockOscillatorDisconnect = vi.fn();
const mockContextClose         = vi.fn().mockResolvedValue(undefined);

const createMockOscillator = () => ({
  type: 'sine' as OscillatorType,
  frequency: { setValueAtTime: vi.fn() },
  connect: mockOscillatorConnect,
  disconnect: mockOscillatorDisconnect,
  start: mockOscillatorStart,
  stop: mockOscillatorStop,
  onended: null as (() => void) | null,
});

const createMockGainNode = () => ({
  gain: {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  },
  connect: vi.fn(),
  disconnect: vi.fn(),
});

const createMockMasterGain = () => ({
  gain: { setValueAtTime: vi.fn() },
  connect: vi.fn(),
});

 
let mockCtx: any;

/**
 * AudioContext MUST be a regular function (not arrow) to support `new`.
 * Wrapped in vi.fn() so we can spy on constructor calls.
 */
 
const AudioContextMock = vi.fn(function (this: any) {
  this.currentTime = 0;
  this.destination = {};
  this.createOscillator = vi.fn(() => createMockOscillator());
  this.createGain = vi
    .fn()
    .mockReturnValueOnce(createMockMasterGain())   // 1st call → master gain
    .mockImplementation(() => createMockGainNode()); // subsequent → tone gains
  this.close = mockContextClose;
   
  mockCtx = this; // expose reference for assertions
});

vi.stubGlobal('AudioContext', AudioContextMock);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CryptoSonifier', () => {
  let sonifier: CryptoSonifier;

  beforeEach(() => {
    vi.clearAllMocks();
    sonifier = new CryptoSonifier();
  });

  // ── Byte Frequency Mapping ──────────────────────────────────────────────────

  describe('byteToFrequency()', () => {
    it('maps byte 0 to base frequency (200 Hz)', () => {
      expect(sonifier.byteToFrequency(0)).toBeCloseTo(200, 1);
    });

    it('maps byte 255 to ~2000 Hz', () => {
      expect(sonifier.byteToFrequency(255)).toBeCloseTo(2000, 0);
    });

    it('maps byte 128 to a midpoint frequency between 200–2000 Hz', () => {
      const mid = sonifier.byteToFrequency(128);
      expect(mid).toBeGreaterThan(200);
      expect(mid).toBeLessThan(2000);
    });

    it('clamps values below 0 to 200 Hz', () => {
      expect(sonifier.byteToFrequency(-1)).toBeCloseTo(200, 1);
    });

    it('clamps values above 255 to ~2000 Hz', () => {
      expect(sonifier.byteToFrequency(300)).toBeCloseTo(2000, 0);
    });

    it('is monotonically increasing across the byte range', () => {
      const freqs = [0, 64, 128, 192, 255].map((b) => sonifier.byteToFrequency(b));
      for (let i = 1; i < freqs.length; i++) {
        expect(freqs[i]).toBeGreaterThan(freqs[i - 1]);
      }
    });
  });

  // ── Hamming Distance Classification ────────────────────────────────────────

  describe('classifyDissonance()', () => {
    it('classifies dH=0 as consonant', () => {
      expect(sonifier.classifyDissonance(0)).toBe('consonant');
    });

    it('classifies dH=32 as consonant (upper boundary)', () => {
      expect(sonifier.classifyDissonance(32)).toBe('consonant');
    });

    it('classifies dH=33 as minor', () => {
      expect(sonifier.classifyDissonance(33)).toBe('minor');
    });

    it('classifies dH=64 as minor (upper boundary)', () => {
      expect(sonifier.classifyDissonance(64)).toBe('minor');
    });

    it('classifies dH=65 as dissonant', () => {
      expect(sonifier.classifyDissonance(65)).toBe('dissonant');
    });

    it('classifies dH=128 as dissonant (max AES state bit-flip)', () => {
      expect(sonifier.classifyDissonance(128)).toBe('dissonant');
    });
  });

  // ── Audio Lifecycle ─────────────────────────────────────────────────────────

  describe('setEnabled() / isEnabled()', () => {
    it('starts disabled by default', () => {
      expect(sonifier.isEnabled()).toBe(false);
    });

    it('initializes AudioContext on first enable', () => {
      sonifier.setEnabled(true);
      expect(AudioContextMock).toHaveBeenCalledOnce();
      expect(sonifier.isEnabled()).toBe(true);
    });

    it('does not create a second AudioContext on re-enable', () => {
      sonifier.setEnabled(true);
      sonifier.setEnabled(false);
      sonifier.setEnabled(true);
      expect(AudioContextMock).toHaveBeenCalledOnce();
    });

    it('reports disabled after setEnabled(false)', () => {
      sonifier.setEnabled(true);
      sonifier.setEnabled(false);
      expect(sonifier.isEnabled()).toBe(false);
    });
  });

  // ── Tone Playback ───────────────────────────────────────────────────────────

  describe('playByteMutation()', () => {
    beforeEach(() => {
      // setEnabled(true) triggers new AudioContext() → sets mockCtx
      sonifier.setEnabled(true);
    });

    it('creates an oscillator when enabled', () => {
      sonifier.playByteMutation(128, 0);
      expect(mockCtx.createOscillator).toHaveBeenCalled();
    });

    it('starts and stops the oscillator', () => {
      sonifier.playByteMutation(64, 0);
      expect(mockOscillatorStart).toHaveBeenCalled();
      expect(mockOscillatorStop).toHaveBeenCalled();
    });

    it('does not create oscillator when disabled', () => {
      sonifier.setEnabled(false);
      sonifier.playByteMutation(128, 0);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  // ── Avalanche Chord ─────────────────────────────────────────────────────────

  describe('playAvalancheChord()', () => {
    beforeEach(() => {
      sonifier.setEnabled(true);
    });

    it('creates 3 oscillators for consonant chord (dH=20)', () => {
      sonifier.playAvalancheChord(20);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('creates 3 oscillators for minor chord (dH=50)', () => {
      sonifier.playAvalancheChord(50);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('creates 4 oscillators for dissonant tritone cluster (dH=100)', () => {
      sonifier.playAvalancheChord(100);
      expect(mockCtx.createOscillator).toHaveBeenCalledTimes(4);
    });

    it('does nothing when disabled', () => {
      sonifier.setEnabled(false);
      sonifier.playAvalancheChord(50);
      expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });
  });

  // ── Dispose ─────────────────────────────────────────────────────────────────

  describe('dispose()', () => {
    it('closes the AudioContext', () => {
      sonifier.setEnabled(true);
      sonifier.dispose();
      expect(mockContextClose).toHaveBeenCalled();
    });

    it('resets enabled state to false after dispose', () => {
      sonifier.setEnabled(true);
      sonifier.dispose();
      expect(sonifier.isEnabled()).toBe(false);
    });

    it('is safe to call when never initialized', () => {
      expect(() => sonifier.dispose()).not.toThrow();
    });
  });
});
