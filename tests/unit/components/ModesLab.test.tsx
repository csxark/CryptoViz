import React from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ModesLab from '../../../components/modes/ModesLab'

describe('ModesLab Block Grouping & Error Propagation', () => {
  it('renders plaintext input and byte flip slider', () => {
    render(<ModesLab />)

    expect(screen.getByLabelText(/Plaintext \(ASCII\)/i)).toBeDefined()
    expect(screen.getByLabelText(/Flip one plaintext byte/i)).toBeDefined()
  })

  it('displays mode chaining diagram trigger button', () => {
    render(<ModesLab />)

    const button = screen.getByText(/View Mode Chaining Diagrams & Feedback Flow/i)
    expect(button).toBeDefined()
  })

  it('renders without crashing and computes results when window.Worker is unavailable (SSR/JSDOM safety)', async () => {
    expect(typeof Worker).toBe('undefined')

    render(<ModesLab />)

    expect(await screen.findByText('ECB')).toBeDefined()
  })
})