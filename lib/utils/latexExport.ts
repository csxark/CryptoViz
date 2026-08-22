import type { CipherStep } from '../cipher/types'

const LATEX_TEXT_MAP: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '$': '\\$',
  '&': '\\&',
  '#': '\\#',
  '^': '\\textasciicircum{}',
  '_': '\\_',
  '%': '\\%',
  '~': '\\textasciitilde{}'
}
const LATEX_TEXT_REGEX = /[\\{}$&#^_%~]/g

/**
 * Escapes text for safe inclusion in standard LaTeX text mode.
 */
export function escapeLatexText(text: string): string {
  if (!text) return ''
  return text.replace(LATEX_TEXT_REGEX, (match) => LATEX_TEXT_MAP[match] || match)
}

const LATEX_MATH_MAP: Record<string, string> = {
  '\\': '\\backslash{}',
  '{': '\\{',
  '}': '\\}',
  '&': '\\&',
  '%': '\\%',
  '$': '\\$',
  '#': '\\#'
}
const LATEX_MATH_REGEX = /[\\{}&%$#]/g

/**
 * Escapes content intended for math mode (where e.g. _ and ^ are valid).
 * Here we only escape characters that would break the LaTeX compiler in math mode.
 */
export function escapeLatexMath(text: string): string {
  if (!text) return ''
  return text.replace(LATEX_MATH_REGEX, (match) => LATEX_MATH_MAP[match] || match)
}

/**
 * Converts a 2D string array into a LaTeX bmatrix environment.
 */
export function matrixToLatex(matrix: string[][]): string {
  if (!matrix || matrix.length === 0) {
    return '\\begin{bmatrix}\n\\end{bmatrix}'
  }

  const rows = matrix.map(row => {
    return row.map(cell => escapeLatexMath(String(cell))).join(' & ')
  })

  return `\\begin{bmatrix}\n${rows.join(' \\\\\n')}\n\\end{bmatrix}`
}

/**
 * Converts a 16-byte hex string (AES state) into a 4x4 LaTeX bmatrix.
 * In CryptoViz, AES state is explicitly column-major:
 * Row 0: s[0], s[4], s[8], s[12]
 * Row 1: s[1], s[5], s[9], s[13]
 * Row 2: s[2], s[6], s[10], s[14]
 * Row 3: s[3], s[7], s[11], s[15]
 */
export function aesStateToLatex(hexString: string): string {
  if (!hexString || typeof hexString !== 'string') {
    throw new Error('AES state must be a valid hex string.')
  }
  const cleanHex = hexString.replace(/[^0-9a-fA-F]/g, '')
  if (cleanHex.length !== 32) {
    throw new Error(`AES state must be exactly 16 bytes (32 hex characters). Got ${cleanHex.length} chars.`)
  }

  const bytes: string[] = []
  for (let i = 0; i < 32; i += 2) {
    bytes.push(cleanHex.substring(i, i + 2).toUpperCase())
  }

  const matrix: string[][] = [
    [bytes[0], bytes[4], bytes[8], bytes[12]],
    [bytes[1], bytes[5], bytes[9], bytes[13]],
    [bytes[2], bytes[6], bytes[10], bytes[14]],
    [bytes[3], bytes[7], bytes[11], bytes[15]],
  ]

  return matrixToLatex(matrix)
}

/**
 * Renders a CipherStep to LaTeX.
 * Does not fabricate missing mathematical derivations.
 */
export function stepToLatex(step: CipherStep, cipherId: string): string {
  const lines: string[] = []

  if (step.label) {
    lines.push(`\\textbf{${escapeLatexText(step.label)}} \\\\`)
  }
  if (step.note) {
    lines.push(`\\text{${escapeLatexText(step.note)}} \\\\`)
  }

  if (step.matrix) {
    lines.push('\\[')
    lines.push(matrixToLatex(step.matrix))
    lines.push('\\]')
  } else if (cipherId === 'aes' && step.inputState && step.inputState.length === 32) {
    // Only attempt to parse as AES state if it's the 'aes' cipher and exactly 16 bytes (32 hex chars).
    // Note: some steps might just be strings that happen to be 32 chars, but the aes engine uses hex state natively.
    try {
      const latexMatrix = aesStateToLatex(step.inputState)
      lines.push('\\[')
      lines.push(latexMatrix)
      if (step.outputState && step.outputState.length === 32 && step.outputState !== step.inputState) {
        lines.push('\\rightarrow')
        lines.push(aesStateToLatex(step.outputState))
      }
      lines.push('\\]')
    } catch {
      // Fallback if parsing fails (e.g. not a hex string)
      lines.push(`Input State: \\texttt{${escapeLatexText(step.inputState)}} \\\\`)
      if (step.outputState && step.outputState !== step.inputState) {
        lines.push(`Output State: \\texttt{${escapeLatexText(step.outputState)}} \\\\`)
      }
    }
  } else {
    if (step.inputState) {
      lines.push(`Input State: \\texttt{${escapeLatexText(step.inputState)}} \\\\`)
    }
    if (step.outputState && step.outputState !== step.inputState) {
      lines.push(`Output State: \\texttt{${escapeLatexText(step.outputState)}} \\\\`)
    }
  }

  return lines.join('\n')
}
