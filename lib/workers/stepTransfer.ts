import type { CipherStep } from '@/lib/cipher/types'

/**
 * Structured cloning a large array of rich trace objects can block the main
 * thread while the browser serializes the response. Keep small traces on the
 * existing protocol, but move larger traces through a transferable buffer.
 */
export const WORKER_STEP_TRANSFER_THRESHOLD = 100

export function encodeCipherSteps(steps: CipherStep[]): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(steps))
}

export function decodeCipherSteps(buffer: ArrayBuffer | Uint8Array): CipherStep[] {
  const decoded = new TextDecoder().decode(buffer)
  const parsed: unknown = JSON.parse(decoded)

  if (!Array.isArray(parsed)) {
    throw new Error('Invalid transferred cipher steps payload.')
  }

  return parsed as CipherStep[]
}
