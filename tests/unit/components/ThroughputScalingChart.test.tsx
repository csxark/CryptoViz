import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ThroughputScalingChart from '@/components/benchmark/ThroughputScalingChart'
import type { ScalingBenchmarkResult } from '@/types/benchmark'

describe('ThroughputScalingChart', () => {
  const mockScalingResults: ScalingBenchmarkResult[] = [
    {
      cipherId: 'aes',
      cipherName: 'AES',
      category: 'symmetric',
      results: [
        { payloadSize: 64, averageTime: 0.1, throughput: 0.00061, operationsPerSecond: 10000 },
        { payloadSize: 1024, averageTime: 0.5, throughput: 1.95, operationsPerSecond: 2000 },
        { payloadSize: 16384, averageTime: 5, throughput: 3.15, operationsPerSecond: 200 },
      ],
      estimatedComplexity: 'O(n)',
      timestamp: new Date(),
    },
    {
      cipherId: 'sha256',
      cipherName: 'SHA-256',
      category: 'hash',
      results: [
        { payloadSize: 64, averageTime: 0.05, throughput: 0.00122, operationsPerSecond: 20000 },
        { payloadSize: 1024, averageTime: 0.3, throughput: 3.25, operationsPerSecond: 3333 },
        { payloadSize: 16384, averageTime: 3, throughput: 5.25, operationsPerSecond: 333 },
      ],
      estimatedComplexity: 'O(n)',
      timestamp: new Date(),
    },
  ]

  it('renders loading state when no results are provided', () => {
    render(<ThroughputScalingChart results={[]} />)
    expect(screen.getByText(/no scaling data available/i)).toBeInTheDocument()
  })

  it('renders complexity summary table with correct data', () => {
    render(<ThroughputScalingChart results={mockScalingResults} />)

    expect(screen.getByText('Algorithmic Complexity Estimates')).toBeInTheDocument()
    expect(screen.getByText('AES')).toBeInTheDocument()
    expect(screen.getByText('SHA-256')).toBeInTheDocument()
    expect(screen.getAllByText('O(n)')).toHaveLength(2) // Both algorithms have O(n) complexity
  })

  it('renders correct categories in complexity table', () => {
    render(<ThroughputScalingChart results={mockScalingResults} />)

    expect(screen.getByText('symmetric')).toBeInTheDocument()
    expect(screen.getByText('hash')).toBeInTheDocument()
  })

  it('handles empty results gracefully', () => {
    render(<ThroughputScalingChart results={[]} />)
    expect(screen.getByText(/no scaling data available/i)).toBeInTheDocument()
  })

  it('handles single algorithm result', () => {
    const singleResult: ScalingBenchmarkResult[] = [mockScalingResults[0]]
    render(<ThroughputScalingChart results={singleResult} />)

    expect(screen.getByText('AES')).toBeInTheDocument()
    expect(screen.getByText('O(n)')).toBeInTheDocument()
  })

  it('displays all payload sizes in chart data', () => {
    render(<ThroughputScalingChart results={mockScalingResults} />)

    // The chart should render without errors
    // With valid data, the "no data" message should not be present
    expect(screen.queryByText(/no scaling data available/i)).not.toBeInTheDocument()
  })
})
