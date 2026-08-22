import type { CipherTraceFile } from './cipherTrace'
import { stepToLatex, escapeLatexText } from './latexExport'
import { citationToBibtex } from './citationRegistry'

function escapeMd(text: string): string {
  if (!text) return ''
  return text.replace(/[`*_{}[\]()#+\-.!]/g, '\\$&')
}

function getSafeCodeFence(content: string): string {
  const match = content.match(/`+/g)
  let max = 0
  if (match) {
    max = Math.max(...match.map(m => m.length))
  }
  return '`'.repeat(Math.max(3, max + 1))
}

/**
 * Converts an entire CipherTraceFile to a Markdown session document.
 * Only exports information actually present in the trace.
 */
export function traceToMarkdown(trace: CipherTraceFile): string {
  const lines: string[] = []

  lines.push('# Cipher Execution')
  lines.push('')

  lines.push('## Cipher')
  lines.push(`**Name:** ${escapeMd(trace.metadata.name)}`)
  if (trace.metadata.modeOfOperation) {
    lines.push(`**Mode:** ${escapeMd(trace.metadata.modeOfOperation)}`)
  }
  lines.push(`**Direction:** ${trace.direction === 'encrypt' ? 'Encryption' : 'Decryption'}`)
  lines.push('')

  lines.push('## Input')
  const inFence = getSafeCodeFence(trace.input)
  lines.push(inFence + 'text')
  lines.push(trace.input)
  lines.push(inFence)
  lines.push('')

  lines.push('## Parameters')
  const safeKey = trace.key.replace(/`/g, '')
  lines.push(`**Key:** \`${safeKey}\``)

  const optionsEntries = Object.entries(trace.options)
  if (optionsEntries.length > 0) {
    lines.push('')
    lines.push('**Options:**')
    optionsEntries.forEach(([k, v]) => {
      const safeV = String(v).replace(/`/g, '')
      lines.push(`- ${escapeMd(k)}: \`${safeV}\``)
    })
  }
  lines.push('')

  lines.push('## Steps')
  lines.push('')

  if (trace.steps && trace.steps.length > 0) {
    trace.steps.forEach(step => {
      lines.push(`### Step ${step.index + 1}: ${escapeMd(step.label)}`)
      if (step.note) {
        lines.push('')
        lines.push(escapeMd(step.note))
      }
      lines.push('')

      lines.push('#### State')
      lines.push('')

      // Output LaTeX representation
      const latex = stepToLatex(step, trace.cipherId)
      if (latex.includes('\\[') || latex.includes('$$')) {
        lines.push(latex)
      } else {
        lines.push('$$')
        lines.push(latex)
        lines.push('$$')
      }
      lines.push('')
    })
  } else {
    lines.push('_No steps recorded._')
    lines.push('')
  }

  lines.push('## Final Result')
  lines.push(`**Output Encoding:** ${escapeMd(trace.outputEncoding)}`)
  const outFence = getSafeCodeFence(trace.output)
  lines.push(outFence + 'text')
  lines.push(trace.output)
  lines.push(outFence)
  lines.push('')

  const bibtex = citationToBibtex(trace.cipherId, trace.metadata)
  if (bibtex) {
    lines.push('## References')
    lines.push('```bibtex')
    lines.push(bibtex)
    lines.push('```')
    lines.push('')
  }

  return lines.join('\n')
}
