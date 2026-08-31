'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CryptoSonifier, type SonifierConfig } from '@/lib/accessibility/sonifier';

export interface UseCryptoSonifierReturn {
  /** Whether audio feedback is currently active */
  isEnabled: boolean;
  /** Toggle audio on/off (lazily initializes AudioContext on first enable) */
  toggle: () => void;
  /** Play arpeggiated tone for a byte mutation at given state-matrix index */
  playByteMutation: (byte: number, index: number) => void;
  /** Play polyphonic chord reflecting avalanche Hamming distance */
  playAvalancheChord: (hammingDistance: number) => void;
}

/**
 * useCryptoSonifier
 *
 * Provides real-time Web Audio feedback for cryptographic step animations.
 * AudioContext is lazily initialized on first user-initiated toggle to comply
 * with browser autoplay policies.
 */
export function useCryptoSonifier(config?: SonifierConfig): UseCryptoSonifierReturn {
  const sonifierRef = useRef<CryptoSonifier | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const isEnabledRef = useRef(false);

  useEffect(() => {
    sonifierRef.current = new CryptoSonifier(config);
    return () => {
      sonifierRef.current?.dispose();
      sonifierRef.current = null;
    };
    // config intentionally omitted — changes after mount are ignored
     
  }, []);

  const toggle = useCallback(() => {
    const next = !isEnabledRef.current;
    sonifierRef.current?.setEnabled(next);
    isEnabledRef.current = next;
    setIsEnabled(next);
  }, []);

  const playByteMutation = useCallback((byte: number, index: number) => {
    sonifierRef.current?.playByteMutation(byte, index);
  }, []);

  const playAvalancheChord = useCallback((hammingDistance: number) => {
    sonifierRef.current?.playAvalancheChord(hammingDistance);
  }, []);

  return { isEnabled, toggle, playByteMutation, playAvalancheChord };
}
