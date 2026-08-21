import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const rgb = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
  const linear = rgb.map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function contrastRatio(foreground: string, background: string): number {
  const light = Math.max(luminance(foreground), luminance(background))
  const dark = Math.min(luminance(foreground), luminance(background))
  return (light + 0.05) / (dark + 0.05)
}

function readTokens() {
  const css = fs.readFileSync(path.resolve(process.cwd(), 'app/globals.css'), 'utf8')
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}\s*\.dark/)?.[1] ?? ''
  const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\}\s*\/\* System high-contrast/)?.[1] ?? ''
  const parse = (block: string) => Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)].map((match) => [match[1], match[2]]),
  )
  return { css, light: parse(rootBlock), dark: parse(darkBlock) }
}

describe('visualizer WCAG contrast tokens', () => {
  it('defines the semantic diff tokens and keeps regular text at AA contrast', () => {
    const { light, dark } = readTokens()
    for (const tokens of [light, dark]) {
      expect(tokens['diff-highlight-bg']).toBeDefined()
      expect(tokens['diff-highlight-fg']).toBeDefined()
      expect(tokens['diff-highlight-border']).toBeDefined()
      expect(contrastRatio(tokens['diff-highlight-fg'], tokens['diff-highlight-bg'])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('keeps category badge text at AA contrast in the default palette', () => {
    const { light, dark } = readTokens()
    for (const tokens of [light, dark]) {
      for (const category of ['classical', 'symmetric', 'asymmetric', 'hash']) {
        expect(contrastRatio(tokens[`category-${category}-fg`], tokens[`category-${category}-bg`])).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('configures system high-contrast and forced-colors fallbacks', () => {
    const { css } = readTokens()
    expect(css).toContain('@media (prefers-contrast: more)')
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('.diff-highlight')
    expect(css).toContain('.category-badge')
  })

  it('removes the low-contrast amber byte-diff classes from the affected visualizers', () => {
    const files = [
      'components/modes/ModesLab.tsx',
      'components/cipher/PlayfairGrid.tsx',
      'components/benchmark/ComparisonChart.tsx',
      'components/ui/ByteHeatmap.tsx',
    ]
    for (const file of files) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8')
      expect(source).not.toContain('bg-amber-200')
      expect(source).not.toContain('dark:bg-amber-500/40')
      expect(source).not.toContain('bg-teal-100 text-teal-800')
      expect(source).not.toContain('bg-pink-100 text-pink-800')
    }
  })
})
