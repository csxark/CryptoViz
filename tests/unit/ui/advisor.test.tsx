import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import DecisionTree from '../../../components/advisor/DecisionTree'
import { ADVISOR_TREE, QuestionNode } from '../../../lib/advisor/treeData'
import React from 'react'

// Mock next/link to avoid router errors in tests
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode, href: string }) => (
    <a href={href}>{children}</a>
  )
}))

describe('DecisionTree', () => {
  it('renders the initial start question', () => {
    render(<DecisionTree />)
    const startNode = ADVISOR_TREE['start'] as QuestionNode
    
    // Should display the first question
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(startNode.question)
    
    // Should render all options
    startNode.options.forEach(option => {
      expect(screen.getByText(option.label)).toBeInTheDocument()
    })
  })

  it('navigates to the next question when an option is clicked', () => {
    render(<DecisionTree />)
    
    // Click "Hide data (Encryption)"
    fireEvent.click(screen.getByText('Hide data (Encryption)'))
    
    // Should now show the next question
    const nextNode = ADVISOR_TREE['q_encrypt_shared'] as QuestionNode
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(nextNode.question)
    
    // Should show breadcrumb history
    expect(screen.getByRole('navigation', { name: /decision history/i })).toBeInTheDocument()
    expect(screen.getByText('Goal: Encryption')).toBeInTheDocument()
  })

  it('allows going back to the previous question', () => {
    render(<DecisionTree />)
    
    // Go forward
    fireEvent.click(screen.getByText('Hide data (Encryption)'))
    expect(screen.getByText('Goal: Encryption')).toBeInTheDocument()
    
    // Go back
    fireEvent.click(screen.getByRole('button', { name: /go back one step/i }))
    
    // Should be back at start
    const startNode = ADVISOR_TREE['start'] as QuestionNode
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(startNode.question)
    
    // History should be clear
    expect(screen.queryByRole('navigation', { name: /decision history/i })).not.toBeInTheDocument()
  })

  it('can navigate to a final recommendation', () => {
    render(<DecisionTree />)
    
    // Navigate a path: Start -> Key Exchange -> Recommendation
    fireEvent.click(screen.getByText('Establish a shared secret (Key Exchange)'))
    
    // Should display recommendation heading
    expect(screen.getByRole('heading', { name: /recommendation/i })).toBeInTheDocument()
    
    // Should display the recommended ciphers
    expect(screen.getByText('Diffie-Hellman')).toBeInTheDocument()
    
    // Should have links to the playground
    const links = screen.getAllByRole('link', { name: /open in playground/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/visualizer/'))
  })

  it('allows restarting the advisor from the end', () => {
    render(<DecisionTree />)
    
    // Navigate to end
    fireEvent.click(screen.getByText('Establish a shared secret (Key Exchange)'))
    
    // Click Start Over
    fireEvent.click(screen.getByRole('button', { name: /start over/i }))
    
    // Should be back at start
    const startNode = ADVISOR_TREE['start'] as QuestionNode
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(startNode.question)
  })
})
