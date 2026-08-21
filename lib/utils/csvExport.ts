import { BenchmarkResult, BenchmarkSession } from '@/types/benchmark'

/**
 * Escape a value for a CSV cell: neutralize spreadsheet formula injection and
 * quote per RFC 4180 (double embedded quotes, wrap in quotes). Previously cells
 * were wrapped as `"${cell}"` with no escaping, so an embedded `"`, `,` or
 * newline broke row/column integrity and a leading `=`/`+`/`-`/`@` was evaluated
 * as a formula by spreadsheet apps.
 */
function escapeCsvCell(value: unknown): string {
  let cell = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(cell)) {
    cell = `'${cell}`
  }
  return `"${cell.replace(/"/g, '""')}"`
}

/**
 * Exports benchmark results as CSV
 */
export function exportToCSV(results: BenchmarkResult[], filename: string = 'benchmark-results.csv'): void {
  const headers = [
    'Cipher ID',
    'Cipher Name',
    'Category',
    'Input Size (bytes)',
    'Direction',
    'Iterations',
    'Average Time (ms)',
    'Min Time (ms)',
    'Max Time (ms)',
    'Std Dev (ms)',
    'Total Time (ms)',
    'Operations/Second',
    'Timestamp',
  ]

  const rows = results.map((result) => [
    result.cipherId,
    result.cipherName,
    result.category,
    result.inputSize,
    result.direction,
    result.iterations,
    result.averageTime.toFixed(4),
    result.minTime.toFixed(4),
    result.maxTime.toFixed(4),
    result.stdDev.toFixed(4),
    result.totalTime.toFixed(4),
    result.operationsPerSecond.toFixed(2),
    new Date(result.timestamp).toISOString(),
  ])

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n')

  downloadCSV(csv, filename)
}

/**
 * Exports entire benchmark session as CSV
 */
export function exportSessionToCSV(session: BenchmarkSession): void {
  const sessionHeader = [
    ['Benchmark Session Report'],
    [`Generated: ${new Date(session.timestamp).toISOString()}`],
    [''],
    ['Device Information'],
    ['CPU Cores', String(session.deviceInfo.hardwareConcurrency)],
    ['Device Memory', session.deviceInfo.deviceMemory ? `${session.deviceInfo.deviceMemory} GB` : 'Unknown'],
    ['Platform', session.deviceInfo.platform],
    ['Timezone', session.deviceInfo.timezone],
    ['Screen Resolution', `${session.deviceInfo.screen.width}x${session.deviceInfo.screen.height}`],
    [''],
    ['Benchmark Results'],
  ]

  const headers = [
    'Cipher ID',
    'Cipher Name',
    'Category',
    'Input Size (bytes)',
    'Direction',
    'Iterations',
    'Average Time (ms)',
    'Min Time (ms)',
    'Max Time (ms)',
    'Std Dev (ms)',
    'Operations/Second',
  ]

  const rows = session.results.map((result) => [
    result.cipherId,
    result.cipherName,
    result.category,
    result.inputSize,
    result.direction,
    result.iterations,
    result.averageTime.toFixed(4),
    result.minTime.toFixed(4),
    result.maxTime.toFixed(4),
    result.stdDev.toFixed(4),
    result.operationsPerSecond.toFixed(2),
  ])

  const csv = [
    ...sessionHeader.map((row) => row.map(escapeCsvCell).join(',')),
    headers.join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n')

  downloadCSV(csv, `benchmark-session-${Date.now()}.csv`)
}

/**
 * Triggers CSV download
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Revoke the object URL once the download has been triggered,
  // so the Blob's memory can be reclaimed.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
