import type {
  CipherDefinition,
} from '../cipher/registry'
import type { CipherDirection } from '../cipher/types'

export interface ComparisonSelection {
  leftCipherId: string
  rightCipherId: string
}

export interface ComparisonPanelState {
  cipherId: string
  direction: CipherDirection
  key: string
  options: Record<string, string | number | boolean>
}

export function getSupportedDirections(
  cipher: CipherDefinition,
): CipherDirection[] {
  if (cipher.category === 'hash' || cipher.id === 'dh') {
    return ['encrypt']
  }

  return ['encrypt', 'decrypt']
}

export function normalizeComparisonDirection(
  cipher: CipherDefinition,
  direction: CipherDirection,
): CipherDirection {
  return getSupportedDirections(cipher).includes(direction)
    ? direction
    : 'encrypt'
}

export function createDefaultComparisonPanelState(
  cipher: CipherDefinition,
): ComparisonPanelState {
  const options: Record<string, string | number | boolean> = {}

  for (const option of cipher.options ?? []) {
    if (
      typeof option.default === 'string' ||
      typeof option.default === 'number' ||
      typeof option.default === 'boolean'
    ) {
      options[option.id] = option.default
    }
  }

  return {
    cipherId: cipher.id,
    direction: 'encrypt',
    key: cipher.defaultKey,
    options,
  }
}

export function swapComparisonSelection(
  selection: ComparisonSelection,
): ComparisonSelection {
  return {
    leftCipherId: selection.rightCipherId,
    rightCipherId: selection.leftCipherId,
  }
}

export function createCipherWorkerOptions(
  cipher: CipherDefinition,
  options: Record<string, string | number | boolean>,
): Record<string, unknown> {
  const workerOptions: Record<string, unknown> = {
    instrument: true,
  }

  if (cipher.id === 'des' || cipher.id === '3des' || cipher.id === 'aes') {
    workerOptions.hexInput =
      typeof options.hexInput === 'boolean' ? options.hexInput : true
  }

  if (cipher.id === 'bcrypt') {
    workerOptions.rounds =
      typeof options.rounds === 'number' ? options.rounds : 4
  }

  if (cipher.id === 'rsa') {
    workerOptions.mode = options.demoMode === false ? 'real' : 'demo'
  }

  if (cipher.id === 'dh') {
    workerOptions.mode = 'demo'
    workerOptions.bobSecret =
      typeof options.bobSecret === 'string' ? options.bobSecret : '15'
  }

  return workerOptions
}
