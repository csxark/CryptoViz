import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HmacVisualizer from '../../../components/cipher/HmacVisualizer'
import type { CipherResult } from '../../../lib/cipher/types'

const MOCK_RESULT: CipherResult = {
  output: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
  outputEncoding: 'hex',
  durationMs: 1.25,
  metadata: {
    name: 'HMAC-SHA256',
    blockSize: 64,
    securityStatus: 'secure',
  },
  steps: [
    {
      index: 0,
      label: 'Key Preparation',
      inputState: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b',
      outputState: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      note: 'Key padding / hashing note',
    },
    {
      index: 1,
      label: "Inner Key (K' XOR ipad)",
      inputState: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      outputState: '3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3636363636363636363636363636363636363636363636363636363636363636363636363636363636363636',
      note: 'Inner XOR note',
    },
    {
      index: 2,
      label: 'Inner SHA-256 Hash',
      inputState: '3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d36363636363636363636363636363636363636363636363636363636363636363636363636363636363636364869205468657265',
      outputState: '3b344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cf11',
      note: 'Inner hash note',
    },
    {
      index: 3,
      label: "Outer Key (K' XOR opad)",
      inputState: '0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      outputState: '57575757575757575757575757575757575757575c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c',
      note: 'Outer XOR note',
    },
    {
      index: 4,
      label: 'Outer SHA-256 Hash (Final HMAC)',
      inputState: '57575757575757575757575757575757575757575c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c5c3b344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cf11',
      outputState: 'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7',
      note: 'Final hash note',
    },
  ],
}

describe('HmacVisualizer', () => {
  it('renders nothing when result is null', () => {
    const { container } = render(<HmacVisualizer currentStep={0} result={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when steps list is empty', () => {
    const emptyResult: CipherResult = { ...MOCK_RESULT, steps: [] }
    const { container } = render(<HmacVisualizer currentStep={0} result={emptyResult} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the header and flowchart sections', () => {
    render(<HmacVisualizer currentStep={0} result={MOCK_RESULT} />)
    expect(screen.getByText('HMAC Execution Pipeline')).toBeInTheDocument()
    expect(screen.getByText('Secret Key (K)')).toBeInTheDocument()
    expect(screen.getByText("Prepared Key (K')")).toBeInTheDocument()
    expect(screen.getByText('Inner Key')).toBeInTheDocument()
    expect(screen.getByText('Outer Key')).toBeInTheDocument()
  })

  it('displays the correct details for Step 0 (Key Preparation)', () => {
    render(<HmacVisualizer currentStep={0} result={MOCK_RESULT} />)
    
    // Check active step label and notes
    expect(screen.getByText('Step 0 of 4')).toBeInTheDocument()
    expect(screen.getAllByText('Key Preparation')[0]).toBeInTheDocument()
    expect(screen.getByText('Key padding / hashing note')).toBeInTheDocument()

    // Check states displayed
    expect(screen.getByText('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b')).toBeInTheDocument()
    expect(screen.getByText('0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000')).toBeInTheDocument()
  })

  it('displays the correct details for Step 1 (Inner XOR)', () => {
    render(<HmacVisualizer currentStep={1} result={MOCK_RESULT} />)
    
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(screen.getByText("Inner Key (K' XOR ipad)")).toBeInTheDocument()
    expect(screen.getByText('Inner XOR note')).toBeInTheDocument()

    expect(screen.getByText('3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3636363636363636363636363636363636363636363636363636363636363636363636363636363636363636')).toBeInTheDocument()
  })

  it('displays the correct details for Step 4 (Final HMAC Hashing)', () => {
    render(<HmacVisualizer currentStep={4} result={MOCK_RESULT} />)
    
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
    expect(screen.getByText('Outer SHA-256 Hash (Final HMAC)')).toBeInTheDocument()
    expect(screen.getByText('Final hash note')).toBeInTheDocument()

    expect(screen.getByText('b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7')).toBeInTheDocument()
  })
})
