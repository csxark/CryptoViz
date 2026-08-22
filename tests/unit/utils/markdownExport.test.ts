import { expect, test, describe } from 'vitest'
import { traceToMarkdown } from '../../../lib/utils/markdownExport'
import type { CipherTraceFile } from '../../../lib/utils/cipherTrace'

describe('markdownExport', () => {
  describe('traceToMarkdown', () => {

    test('reports AES mode in trace output', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'aes',
        direction: 'encrypt',
        input: 'IN',
        key: 'KEY',
        options: { mode: 'CBC' },
        metadata: {
          name: 'AES',
          modeOfOperation: 'CBC',
          securityStatus: 'secure',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'OUT',
        outputEncoding: 'utf8',
        steps: []
      }
      const md = traceToMarkdown(trace)
      expect(md).toContain('**Mode:** CBC')
      expect(md).toContain('- mode: \`CBC\`')
    })


    test('escapes Markdown metadata and generates safe code fences', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'dummy',
        direction: 'encrypt',
        input: 'data with `` backticks',
        key: 'key_*#',
        options: { '*mode': 'cbc' },
        metadata: {
          name: '*Cipher*',
          securityStatus: 'secure',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'output ``` backticks',
        outputEncoding: 'utf8',
        steps: [
          {
            index: 0,
            label: '# Header Note',
            note: 'Important: *note*',
            inputState: 'A',
            outputState: 'B'
          }
        ]
      }
      const md = traceToMarkdown(trace)
      expect(md).toContain('**Name:** \\*Cipher\\*')
      expect(md).toContain('**Key:** \`key_\\*\\#\`')
      expect(md).toContain('- \\*mode: \`cbc\`')
      expect(md).toContain('### Step 1: \\# Header Note')
      expect(md).toContain('Important: \\*note\\*')
      expect(md).toContain('```text\ndata with `` backticks\n```')
      expect(md).toContain('````text\noutput ``` backticks\n````')
    })


    test('does not nest display-math delimiters', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'dummy',
        direction: 'encrypt',
        input: 'IN',
        key: 'KEY',
        options: {},
        metadata: {
          name: 'Dummy',
          securityStatus: 'secure',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'OUT',
        outputEncoding: 'utf8',
        steps: [
          {
            index: 0,
            label: 'State',
            matrix: [['1', '2'], ['3', '4']]
          }
        ]
      }
      const md = traceToMarkdown(trace)
      expect(md).toContain('\\begin{bmatrix}')
      expect(md).not.toContain('$')
    })

    test('renders a complete trace with multiple steps', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'caesar',
        direction: 'encrypt',
        input: 'HELLO',
        key: '3',
        options: { demoMode: true },
        metadata: {
          name: 'Caesar Cipher',
          securityStatus: 'legacy',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'KHOOR',
        outputEncoding: 'utf8',
        steps: [
          {
            index: 0,
            label: 'Shift H',
            inputState: 'H',
            outputState: 'K',
            note: 'Shifted by 3'
          },
          {
            index: 1,
            label: 'Shift E',
            inputState: 'E',
            outputState: 'H',
            note: 'Shifted by 3'
          }
        ]
      }

      const md = traceToMarkdown(trace)

      expect(md).toContain('# Cipher Execution')
      expect(md).toContain('## Cipher')
      expect(md).toContain('**Name:** Caesar Cipher')
      expect(md).toContain('## Input')
      expect(md).toContain('HELLO')
      expect(md).toContain('## Parameters')
      expect(md).toContain('**Key:** `3`')
      expect(md).toContain('**Options:**')
      expect(md).toContain('- demoMode: `true`')
      expect(md).toContain('## Steps')
      expect(md).toContain('### Step 1: Shift H')
      expect(md).toContain('Shifted by 3')
      expect(md).toContain('Input State: \\texttt{H} \\\\')
      expect(md).toContain('Output State: \\texttt{K} \\\\')
      expect(md).toContain('### Step 2: Shift E')
      expect(md).toContain('## Final Result')
      expect(md).toContain('KHOOR')
      // No citation for caesar in our test registry by default
      expect(md).not.toContain('## References')
    })

    test('renders matrix as LaTeX', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'hill',
        direction: 'encrypt',
        input: 'AB',
        key: 'HILL',
        options: {},
        metadata: {
          name: 'Hill Cipher',
          securityStatus: 'legacy',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'XY',
        outputEncoding: 'utf8',
        steps: [
          {
            index: 0,
            label: 'Matrix Setup',
            inputState: 'AB',
            outputState: 'XY',
            matrix: [['1', '2'], ['3', '4']]
          }
        ]
      }

      const md = traceToMarkdown(trace)

      expect(md).toContain('\\begin{bmatrix}')
      expect(md).toContain('1 & 2 \\\\')
      expect(md).toContain('3 & 4')
      expect(md).toContain('\\end{bmatrix}')
      expect(md).toContain('## References')
      expect(md).toContain('```bibtex')
      expect(md).toContain('@article{Hill1929')
    })

    test('handles missing optional fields safely', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'unknown',
        direction: 'encrypt',
        input: 'DATA',
        key: 'KEY',
        options: {},
        metadata: {
          name: 'Unknown Cipher',
          securityStatus: 'legacy',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'OUT',
        outputEncoding: 'utf8',
        steps: []
      }

      const md = traceToMarkdown(trace)
      expect(md).toContain('_No steps recorded._')
      expect(md).not.toContain('**Options:**')
      expect(md).not.toContain('## References')
    })

    test('renders AES state correctly', () => {
      const trace: CipherTraceFile = {
        schemaVersion: 1,
        durationMs: 42,
        timestamp: '2026-08-21T00:00:00.000Z',
        cipherId: 'aes',
        direction: 'encrypt',
        input: 'DATA',
        key: 'KEY',
        options: {},
        metadata: {
          name: 'AES',
          securityStatus: 'secure',
          provenance: { source: 'local', status: 'verified', verificationDetails: {} }
        },
        output: 'OUT',
        outputEncoding: 'utf8',
        steps: [
          {
            index: 0,
            label: 'State',
            inputState: '000102030405060708090A0B0C0D0E0F',
            outputState: '101112131415161718191A1B1C1D1E1F'
          }
        ]
      }

      const md = traceToMarkdown(trace)
      expect(md).toContain('00 & 04 & 08 & 0C')
      expect(md).toContain('\\rightarrow')
      expect(md).toContain('10 & 14 & 18 & 1C')
      expect(md).toContain('## References')
      expect(md).toContain('@techreport{FIPS197')
    })
  })
})
