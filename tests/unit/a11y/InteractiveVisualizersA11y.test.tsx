import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import AttackMemoryGrid from '../../../components/attacks/AttackMemoryGrid'
import { PipelineNode } from '../../../components/pipeline/PipelineNode'
import type { InteractiveByte } from '../../../lib/attacks/interactiveStepper'
import type { NodeModel } from '../../../lib/pipeline/dagEngine'

const bytes: InteractiveByte[] = [
  { index: 0, status: 'recovered', value: 0x41 },
  { index: 1, status: 'testing', guess: 0x42 },
  { index: 2, status: 'unknown' },
]

const node: NodeModel = {
  id: 'node-1',
  type: 'input',
  label: 'Plaintext Input',
  inputs: [{ id: 'input-1', name: 'Data', type: 'DATA' }],
  outputs: [{ id: 'output-1', name: 'Ciphertext', type: 'DATA' }],
  position: { x: 0, y: 0 },
}

describe('interactive visualizer accessibility', () => {
  it('exposes the attack memory as an accessible grid', async () => {
    const { container } = render(<AttackMemoryGrid bytes={bytes} />)
    expect(screen.getByRole('grid', { name: /attack memory byte grid/i })).toBeInTheDocument()
    expect(screen.getAllByRole('gridcell')).toHaveLength(bytes.length)
    expect(screen.getAllByRole('gridcell')[0]).toHaveAttribute('tabindex', '0')
    expect(screen.getAllByRole('gridcell')[1]).toHaveAttribute('tabindex', '-1')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('supports arrow-key navigation between byte cells', () => {
    render(<AttackMemoryGrid bytes={bytes} />)
    const cells = screen.getAllByRole('gridcell')
    cells[0].focus()
    fireEvent.keyDown(cells[0], { key: 'ArrowRight' })
    expect(cells[1]).toHaveFocus()
  })

  it('gives pipeline socket controls accessible names and state', async () => {
    const { container } = render(<PipelineNode node={node} />)
    const socket = screen.getByRole('button', { name: /ciphertext data output/i })
    expect(socket).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(socket)
    expect(socket).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(/buffer state/i)
    expect(await axe(container)).toHaveNoViolations()
  })
})
