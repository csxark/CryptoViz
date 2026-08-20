import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'

describe('Card Component Design System', () => {
  it('renders Card with standard rounded-xl border container styles and passes children', () => {
    render(
      <Card data-testid="test-card" className="custom-test-class">
        <span>Card Content Inside</span>
      </Card>
    )

    const cardElement = screen.getByTestId('test-card')
    expect(cardElement).toBeInTheDocument()
    expect(cardElement).toHaveClass('rounded-xl', 'border', 'border-zinc-200', 'bg-white', 'shadow-sm', 'dark:border-zinc-800', 'dark:bg-zinc-900', 'custom-test-class')
    expect(screen.getByText('Card Content Inside')).toBeInTheDocument()
  })

  it('renders Card sub-components correctly', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader data-testid="card-header">
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent data-testid="card-content">
          <p>Main content area</p>
        </CardContent>
      </Card>
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Main content area')).toBeInTheDocument()
    expect(screen.getByTestId('card-header')).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6')
    expect(screen.getByTestId('card-content')).toHaveClass('p-6', 'pt-0')
  })
})
