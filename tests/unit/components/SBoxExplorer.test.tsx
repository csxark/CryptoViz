import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom'
import SBoxExplorer from '../../../components/sbox/SBoxExplorer'

describe('SBoxExplorer', () => {
  it('renders the AES S-box by default and looks up the default input', () => {
    render(<SBoxExplorer />)
    expect(screen.getByRole('button', { name: 'AES S-Box' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText(/output = 0xed/)).toBeInTheDocument()
  })

  it('updates the lookup when the input changes', () => {
    render(<SBoxExplorer />)
    const input = screen.getByLabelText(/Input byte/i)
    fireEvent.change(input, { target: { value: '0x00' } })
    expect(screen.getByText(/output = 0x63/)).toBeInTheDocument()
  })

  it('shows a validation message for out-of-range input', () => {
    render(<SBoxExplorer />)
    const input = screen.getByLabelText(/Input byte/i)
    fireEvent.change(input, { target: { value: '999' } })
    expect(screen.getByRole('alert')).toHaveTextContent(/between 0 and 255/i)
  })

  it('switches to the AES inverse S-box and inverts the default lookup', () => {
    render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'AES Inverse S-Box' }))
    const input = screen.getByLabelText(/Input byte/i)
    fireEvent.change(input, { target: { value: '0xed' } })
    expect(screen.getByText(/output = 0x53/)).toBeInTheDocument()
  })

  it('switches to DES S-boxes and shows the S-box selector', () => {
    render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'DES S-Boxes' }))
    expect(screen.getByRole('group', { name: 'DES S-box selector' })).toBeInTheDocument()

    const input = screen.getByLabelText(/Input bits/i)
    fireEvent.change(input, { target: { value: '0b011011' } })
    expect(screen.getByText(/output = 5/)).toBeInTheDocument()
  })

  it('updates the input field when a grid cell is clicked', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 0/i })
    fireEvent.click(cell)
    expect(screen.getByText(/output = 0x63/)).toBeInTheDocument()
  })

  it('renders the complete AES grid immediately', () => {
    render(<SBoxExplorer />)
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(256)
  })

  it('does not use SVG animation nodes for grid initialization', () => {
    const { container } = render(<SBoxExplorer />)
    expect(container.querySelectorAll('animate')).toHaveLength(0)
    expect(container.querySelectorAll('animateTransform')).toHaveLength(0)
  })

  it('keeps the grid mounted when the lookup changes', () => {
    render(<SBoxExplorer />)
    const grid = screen.getByRole('grid')
    fireEvent.change(screen.getByLabelText(/Input byte/i), {
      target: { value: '0x00' },
    })
    expect(screen.getByRole('grid')).toBe(grid)
  })

  it('keeps exactly one selected AES cell', () => {
    render(<SBoxExplorer />)
    const input = screen.getByLabelText(/Input byte/i)
    fireEvent.change(input, { target: { value: '0x00' } })
    expect(
      within(screen.getByRole('grid')).getAllByRole('button', { pressed: true }),
    ).toHaveLength(1)
  })

  it('keeps one tabbable AES cell', () => {
    render(<SBoxExplorer />)
    const buttons = within(screen.getByRole('grid')).getAllByRole('button')
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1)
  })

  it('renders only one grid for the selected DES box', () => {
    render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'DES S-Boxes' }))
    expect(screen.getAllByRole('grid')).toHaveLength(1)
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(64)
  })

  it('does not mount all eight DES grids simultaneously', () => {
    render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'DES S-Boxes' }))
    expect(screen.getAllByRole('grid')).toHaveLength(1)
  })

  it('preserves the table while input is invalid', () => {
    render(<SBoxExplorer />)
    fireEvent.change(screen.getByLabelText(/Input byte/i), {
      target: { value: 'not-a-byte' },
    })
    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(256)
  })

  it('preserves the table for an empty input', () => {
    render(<SBoxExplorer />)
    fireEvent.change(screen.getByLabelText(/Input byte/i), { target: { value: '' } })
    expect(screen.getByRole('grid')).toBeInTheDocument()
  })

  it('supports ArrowRight navigation', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 0/i })
    cell.focus()
    fireEvent.keyDown(cell, { key: 'ArrowRight' })
    expect(screen.getByRole('button', { name: /Row 0, column 1/i })).toHaveFocus()
  })

  it('supports ArrowLeft navigation', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 1/i })
    cell.focus()
    fireEvent.keyDown(cell, { key: 'ArrowLeft' })
    expect(screen.getByRole('button', { name: /Row 0, column 0/i })).toHaveFocus()
  })

  it('supports ArrowDown navigation', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 0/i })
    cell.focus()
    fireEvent.keyDown(cell, { key: 'ArrowDown' })
    expect(screen.getByRole('button', { name: /Row 1, column 0/i })).toHaveFocus()
  })

  it('supports ArrowUp navigation', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 0/i })
    cell.focus()
    fireEvent.keyDown(cell, { key: 'ArrowUp' })
    expect(screen.getByRole('button', { name: /Row 0, column 0/i })).toHaveFocus()
  })

  it('supports Home navigation', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 9/i })
    cell.focus()
    fireEvent.keyDown(cell, { key: 'Home' })
    expect(screen.getByRole('button', { name: /Row 0, column 0/i })).toHaveFocus()
  })

  it('supports End navigation', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 9/i })
    cell.focus()
    fireEvent.keyDown(cell, { key: 'End' })
    expect(screen.getByRole('button', { name: /Row 15, column 15/i })).toHaveFocus()
  })

  it('keeps AES grid cell row 0 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 0 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 0, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 1 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 1, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 2 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 2, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 3 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 3, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 4 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 4, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 5 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 5, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 6 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 6, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 7 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 7, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 8 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 8, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 9 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 9, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 10 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 10, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 11 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 11, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 12 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 12, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 13 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 13, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 14 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 14, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 0 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 0:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 1 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 1:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 2 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 2:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 3 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 3:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 4 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 4:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 5 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 5:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 6 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 6:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 7 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 7:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 8 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 8:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 9 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 9:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 10 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 10:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 11 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 11:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 12 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 12:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 13 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 13:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 14 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 14:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps AES grid cell row 15 column 15 available', () => {
    render(<SBoxExplorer />)
    const cell = screen.getByRole('button', { name: /Row 15, column 15:/i })
    expect(cell).toBeInTheDocument()
    expect(cell).toHaveAttribute('aria-pressed', 'false')
  })

  it('updates every selected corner without changing the cell count', () => {
    render(<SBoxExplorer />)
    const input = screen.getByLabelText(/Input byte/i)
    for (const value of ['0x00', '0x0f', '0xf0', '0xff']) {
      fireEvent.change(input, { target: { value } })
      expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(256)
    }
  })

  it('keeps the table label stable through repeated lookups', () => {
    render(<SBoxExplorer />)
    const grid = screen.getByRole('grid')
    for (const value of ['0x00', '0x53', '0xa5', '0xff']) {
      fireEvent.change(screen.getByLabelText(/Input byte/i), {
        target: { value },
      })
      expect(screen.getByRole('grid')).toBe(grid)
      expect(grid).toHaveAccessibleName('AES S-Box lookup table')
    }
  })

  it('does not create duplicate grids after switching AES variants', () => {
    render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'AES Inverse S-Box' }))
    fireEvent.click(screen.getByRole('button', { name: 'AES S-Box' }))
    expect(screen.getAllByRole('grid')).toHaveLength(1)
  })

  it('does not create duplicate grids after switching from DES to AES', () => {
    render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'DES S-Boxes' }))
    fireEvent.click(screen.getByRole('button', { name: 'AES S-Box' }))
    expect(screen.getAllByRole('grid')).toHaveLength(1)
  })

  it('does not schedule animation-frame work during first render', () => {
    const original = window.requestAnimationFrame
    let calls = 0
    window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      calls += 1
      return 0
    }) as typeof window.requestAnimationFrame
    try {
      render(<SBoxExplorer />)
      expect(calls).toBe(0)
    } finally {
      window.requestAnimationFrame = original
    }
  })

  it('does not schedule timeout work during first render', () => {
    const original = window.setTimeout
    let calls = 0
    window.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
      calls += 1
      return 0 as unknown as ReturnType<typeof setTimeout>
    }) as typeof window.setTimeout
    try {
      render(<SBoxExplorer />)
      expect(calls).toBe(0)
    } finally {
      window.setTimeout = original
    }
  })

  it('keeps 256 buttons after repeated controlled-input updates', () => {
    render(<SBoxExplorer />)
    const input = screen.getByLabelText(/Input byte/i)
    for (const value of ['0x01', '0x12', '0x34', '0x56', '0x78', '0x9a', '0xbc', '0xde', '0xf0']) {
      fireEvent.change(input, { target: { value } })
      expect(within(screen.getByRole('grid')).getAllByRole('button')).toHaveLength(256)
    }
  })

  it('keeps inactive cells non-selected after repeated lookups', () => {
    render(<SBoxExplorer />)
    const input = screen.getByLabelText(/Input byte/i)
    for (const value of ['0x00', '0x11', '0x22', '0x33', '0x44']) {
      fireEvent.change(input, { target: { value } })
      const selected = within(screen.getByRole('grid')).getAllByRole('button', { pressed: true })
      expect(selected).toHaveLength(1)
    }
  })

  it('keeps accessible names deterministic after rerendering', () => {
    const result = render(<SBoxExplorer />)
    const before = within(screen.getByRole('grid'))
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
    result.rerender(<SBoxExplorer />)
    const after = within(screen.getByRole('grid'))
      .getAllByRole('button')
      .map((button) => button.getAttribute('aria-label'))
    expect(after).toEqual(before)
  })

  it('renders the inverse table without SVG animation nodes', () => {
    const { container } = render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'AES Inverse S-Box' }))
    expect(container.querySelectorAll('animate')).toHaveLength(0)
    expect(container.querySelectorAll('animateTransform')).toHaveLength(0)
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(256)
  })

  it('renders DES without SVG animation nodes', () => {
    const { container } = render(<SBoxExplorer />)
    fireEvent.click(screen.getByRole('button', { name: 'DES S-Boxes' }))
    expect(container.querySelectorAll('animate')).toHaveLength(0)
    expect(container.querySelectorAll('animateTransform')).toHaveLength(0)
    expect(within(screen.getByRole('grid')).getAllByRole('gridcell')).toHaveLength(64)
  })

  it('keeps one tabbable cell after keyboard movement', () => {
    render(<SBoxExplorer />)
    const start = screen.getByRole('button', { name: /Row 0, column 0/i })
    start.focus()
    fireEvent.keyDown(start, { key: 'ArrowRight' })
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'ArrowDown' })
    const buttons = within(screen.getByRole('grid')).getAllByRole('button')
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1)
  })
})
