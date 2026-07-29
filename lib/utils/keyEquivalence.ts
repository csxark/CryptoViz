export type AlgorithmFamily = 'Symmetric' | 'RSA' | 'ECC';

export interface KeySizeOption {
  value: number;
  label: string;
  securityBits: number;
  description: string;
}

export const ALGORITHM_FAMILIES: Record<AlgorithmFamily, KeySizeOption[]> = {
  Symmetric: [
    { value: 40, label: '40-bit', securityBits: 40, description: 'Export-grade (broken in 1990s)' },
    { value: 56, label: '56-bit', securityBits: 56, description: 'DES (broken in late 1990s)' },
    { value: 128, label: '128-bit', securityBits: 128, description: 'AES-128 (Standard modern minimum)' },
    { value: 192, label: '192-bit', securityBits: 192, description: 'AES-192 (High security)' },
    { value: 256, label: '256-bit', securityBits: 256, description: 'AES-256 (Top secret / Quantum resistant)' },
  ],
  RSA: [
    { value: 1024, label: '1024-bit', securityBits: 80, description: 'Legacy (Weak, vulnerable to nation-states)' },
    { value: 2048, label: '2048-bit', securityBits: 112, description: 'Bare minimum for short-term data' },
    { value: 3072, label: '3072-bit', securityBits: 128, description: 'Standard minimum (NIST recommended)' },
    { value: 4096, label: '4096-bit', securityBits: 152, description: 'High security (often used for root CAs)' },
    { value: 7680, label: '7680-bit', securityBits: 192, description: 'Extremely high security (impractical overhead)' },
    { value: 15360, label: '15360-bit', securityBits: 256, description: 'Top secret (Rarely used)' },
  ],
  ECC: [
    { value: 160, label: '160-bit', securityBits: 80, description: 'Legacy (Avoid for new systems)' },
    { value: 224, label: '224-bit', securityBits: 112, description: 'P-224 (Short-term use)' },
    { value: 256, label: '256-bit', securityBits: 128, description: 'P-256 (Standard modern minimum)' },
    { value: 384, label: '384-bit', securityBits: 192, description: 'P-384 (High security)' },
    { value: 521, label: '521-bit', securityBits: 256, description: 'P-521 (Top secret equivalent)' },
  ],
};

/**
 * Returns the estimated brute-force search space (2^N) formatted dynamically.
 * Note: We cap the formatting to avoid excessively long scientific notation numbers,
 * but visually indicate the magnitude.
 */
export function getSearchSpaceString(securityBits: number): string {
  if (securityBits <= 56) {
    // For small spaces, we can compute exact or close
    const space = Math.pow(2, securityBits);
    return space.toLocaleString();
  }
  return `2^${securityBits} (approx. 10^${Math.floor(securityBits * Math.log10(2))})`;
}

/**
 * Maps bits of security to a relative NIST status classification
 */
export function getNistStatus(securityBits: number): { label: string; color: string } {
  if (securityBits < 112) {
    return { label: 'Insecure / Deprecated', color: 'text-red-500 dark:text-red-400' };
  }
  if (securityBits === 112) {
    return { label: 'Acceptable (Legacy)', color: 'text-yellow-500 dark:text-yellow-400' };
  }
  if (securityBits >= 128 && securityBits < 192) {
    return { label: 'Standard / Recommended', color: 'text-[#00C2AE] dark:text-[#14D8C2]' };
  }
  return { label: 'High Security', color: 'text-teal-600 dark:text-teal-400' };
}
