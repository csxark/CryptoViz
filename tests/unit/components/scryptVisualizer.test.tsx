import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import crypto from 'crypto'
import ScryptVisualizer from '../../../components/kdf/ScryptVisualizer'

// Mock window.crypto for jsdom environment compatibility
if (typeof window !== 'undefined' && !window.crypto) {
  Object.defineProperty(window, 'crypto', {
    value: {
      getRandomValues: (arr: Uint8Array) => crypto.webcrypto.getRandomValues(arr),
      randomUUID: () => crypto.randomUUID(),
    },
  })
}

// Mock the WorkerPool class so we don't spin up a real Web Worker
vi.mock('@/lib/workers/pool', () => {
  return {
    WorkerPool: class {
      async execute(message: any) {
        return {
          success: true,
          payload: {
            result: {
              derivedKeyHex: '49e21ba2f30ea1d4c2b9a7102e3b5e40e21a2c4e512c1b821908238ba432b012',
              saltHex: '0a0b0c0d0e0f10111213141516171819',
            },
          },
        }
      }
    },
  }
})

describe('ScryptVisualizer Component', () => {
  it('renders parameter selectors and default configurations', () => {
    render(<ScryptVisualizer />)
    
    // Check main labels
    expect(screen.getByLabelText(/input password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cost parameter \(n\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/block size \(r\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/parallelization \(p\)/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/derived key length/i)).toBeInTheDocument()

    // Default configuration: N = 16384, r = 8, p = 1 -> 16 MB memory footprint
    expect(screen.getByText('16.00 MB')).toBeInTheDocument()
    expect(screen.getByText('Meets recommended floor')).toBeInTheDocument()
  })

  it('updates memory footprint when N cost parameter changes', async () => {
    render(<ScryptVisualizer />)
    
    const costSelect = screen.getByLabelText(/cost parameter \(n\)/i)
    
    // Change N to 1024 -> should update memory to 1.00 MB and show warning
    await act(async () => {
      fireEvent.change(costSelect, { target: { value: '1024' } })
    })

    expect(screen.getByText('1.00 MB')).toBeInTheDocument()
    expect(screen.getByText('Below recommended floor')).toBeInTheDocument()
  })

  it('triggers derivation and displays outputs and trace', async () => {
    render(<ScryptVisualizer />)

    const deriveBtn = screen.getByRole('button', { name: /derive key/i })
    
    await act(async () => {
      fireEvent.click(deriveBtn)
    })

    // Should show results
    expect(await screen.findByText('Derived Cryptographic Secret')).toBeInTheDocument()
    expect(await screen.findByText('0a0b0c0d0e0f10111213141516171819')).toBeInTheDocument()
    expect(await screen.findByText('49e21ba2f30ea1d4c2b9a7102e3b5e40e21a2c4e512c1b821908238ba432b012')).toBeInTheDocument()

    // Should show process stages
    expect(screen.getByText('Key Derivation Process Stages')).toBeInTheDocument()
    expect(screen.getByText('Parse Password & Salt Inputs')).toBeInTheDocument()
    expect(screen.getByText('Allocate Memory Footprint')).toBeInTheDocument()
    expect(screen.getByText('Initial PBKDF2 Stretching')).toBeInTheDocument()
    expect(screen.getByText('ROMix Mixing Loop (N = 16,384 iterations)')).toBeInTheDocument()
  })
})
