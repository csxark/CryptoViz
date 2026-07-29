import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AlgorithmMatrix from '../../../components/matrix/AlgorithmMatrix'
import { ALGORITHM_MATRIX_DATA } from '../../../lib/cipher/matrixData'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'

describe('AlgorithmMatrix', () => {
  it('renders the table with correct headers', () => {
    render(<AlgorithmMatrix />)
    expect(screen.getByRole('table', { name: 'Algorithm Compatibility Matrix' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Algorithm' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Block Size' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Key Size' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Speed' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Common Applications' })).toBeInTheDocument()
  })

  it('renders matrix data rows initially', () => {
    render(<AlgorithmMatrix />)
    const firstCipher = ALGORITHM_MATRIX_DATA[0]
    expect(screen.getByText(firstCipher.name)).toBeInTheDocument()
    expect(screen.getAllByText(firstCipher.blockSize).length).toBeGreaterThan(0)
  })

  it('filters data by category when clicked', async () => {
    render(<AlgorithmMatrix />)
    
    // Initially Caesar should be in the document
    expect(screen.getByText('Caesar Cipher')).toBeInTheDocument()
    
    // Click symmetric
    const symmetricBtn = screen.getByRole('button', { name: 'Symmetric' })
    fireEvent.click(symmetricBtn)
    
    // AES should still be there
    expect(screen.getByText('AES')).toBeInTheDocument()
    
    // Caesar should be gone since it is classical
    await waitFor(() => {
      expect(screen.queryByText('Caesar Cipher')).not.toBeInTheDocument()
    })
  })
})
