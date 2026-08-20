import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import Home from '@/app/page'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

vi.mock('@/components/layout/Navbar', () => ({
  default: () => <nav data-testid="navbar">Navbar</nav>,
}))

vi.mock('@/components/layout/footer', () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}))

vi.mock('@/components/HeroIllustration', () => ({
  default: () => <div data-testid="hero-illustration">HeroIllustration</div>,
}))

beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn()
    disconnect = vi.fn()
    unobserve = vi.fn()
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  })
})

describe('Home Page Server Component', () => {
  it('renders algorithm library categories directly without loading delays', () => {
    render(<Home />)
    expect(screen.getByText('Algorithm Library')).toBeInTheDocument()
    expect(screen.getByText('Classical Ciphers')).toBeInTheDocument()
    expect(screen.getByText('Symmetric Cryptosystems')).toBeInTheDocument()
    expect(screen.getByText('Secure Hash Functions')).toBeInTheDocument()
    expect(screen.getByText('Asymmetric Cryptography')).toBeInTheDocument()
  })

  it('renders playground link and core sections', () => {
    render(<Home />)
    const links = screen.getAllByRole('link', { name: /Open Playground/i })
    expect(links.length).toBeGreaterThan(0)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })
})
