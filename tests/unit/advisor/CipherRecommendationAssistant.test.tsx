/**
 * @vitest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CipherRecommendationAssistant from '../../../components/advisor/CipherRecommendationAssistant'

describe('CipherRecommendationAssistant Component Unit Tests', () => {
  it('renders CipherRecommendationAssistant component header and use case presets', () => {
    render(<CipherRecommendationAssistant />)

    expect(screen.getByText(/Select a Common Use Case Scenario/i)).toBeInTheDocument()
    expect(screen.getByText(/Web & API Security/i)).toBeInTheDocument()
    expect(screen.getByText(/Password Hashing & Key Derivation/i)).toBeInTheDocument()
    expect(screen.getByText(/IoT & Embedded Microcontrollers/i)).toBeInTheDocument()
  })

  it('filters algorithms when a use case preset card is clicked', () => {
    render(<CipherRecommendationAssistant />)

    const passwordPreset = screen.getByText(/Password Hashing & Key Derivation/i)
    fireEvent.click(passwordPreset)

    expect(screen.getByRole('heading', { name: /Argon2id/i })).toBeInTheDocument()
  })

  it('toggles code snippet view when View Code button is clicked', () => {
    render(<CipherRecommendationAssistant />)

    const viewCodeButtons = screen.getAllByRole('button', { name: /View Code/i })
    expect(viewCodeButtons.length).toBeGreaterThan(0)

    fireEvent.click(viewCodeButtons[0])

    expect(screen.getByText(/Implementation Example/i)).toBeInTheDocument()
  }, 15000)

  it('switches between Use Case Explorer and Decision Tree Wizard tabs', () => {
    render(<CipherRecommendationAssistant />)

    const wizardTab = screen.getByRole('button', { name: /Decision Tree Wizard/i })
    fireEvent.click(wizardTab)

    expect(screen.getByText(/What is your primary goal\?/i)).toBeInTheDocument()

    const explorerTab = screen.getByRole('button', { name: /Use Case Explorer/i })
    fireEvent.click(explorerTab)

    expect(screen.getByText(/Select a Common Use Case Scenario/i)).toBeInTheDocument()
  }, 15000)
})
