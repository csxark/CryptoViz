import { describe, expect, it } from 'vitest'
import {
  getUpstreamPrerequisites,
  getNodeStatus,
  DAG_NODES,
  DAG_EDGES,
  DAG_PRESETS,
} from '../../../lib/learning/dagData'

describe('DAG Knowledge Explorer Data & Helpers', () => {
  it('defines valid nodes with positive length', () => {
    expect(DAG_NODES.length).toBeGreaterThan(5)
    for (const node of DAG_NODES) {
      expect(node.id).toBeDefined()
      expect(node.title).toBeDefined()
      expect(node.description).toBeDefined()
      expect(node.href).toBeDefined()
      expect(['Fundamentals', 'Symmetric', 'Asymmetric', 'Math']).toContain(node.track)
    }
  })

  it('contains valid edges linking existing nodes', () => {
    expect(DAG_EDGES.length).toBeGreaterThan(5)
    const nodeIds = new Set(DAG_NODES.map((n) => n.id))
    for (const edge of DAG_EDGES) {
      expect(nodeIds.has(edge.from)).toBe(true)
      expect(nodeIds.has(edge.to)).toBe(true)
    }
  })

  it('contains valid track presets', () => {
    expect(DAG_PRESETS.length).toBe(4)
    const nodeIds = new Set(DAG_NODES.map((n) => n.id))
    for (const preset of DAG_PRESETS) {
      expect(preset.id).toBeDefined()
      expect(preset.label).toBeDefined()
      expect(preset.description).toBeDefined()
      expect(preset.nodes.length).toBeGreaterThan(0)
      for (const nodeId of preset.nodes) {
        expect(nodeIds.has(nodeId)).toBe(true)
      }
    }
  })

  it('correctly calculates upstream prerequisites via getUpstreamPrerequisites', () => {
    // security-goals -> encoding-vs-encryption -> stream-ciphers
    const prereqs = getUpstreamPrerequisites('stream-ciphers')
    expect(prereqs.has('encoding-vs-encryption')).toBe(true)
    expect(prereqs.has('security-goals')).toBe(true)
    expect(prereqs.has('stream-ciphers')).toBe(false)
  })

  it('correctly calculates node status via getNodeStatus', () => {
    // 1. Unlocked (Available) by default because it has no prerequisites
    const status1 = getNodeStatus('security-goals', {}, {})
    expect(status1).toBe('Available')

    // 2. Locked because prerequisite 'security-goals' is not completed
    const status2 = getNodeStatus('encoding-vs-encryption', {}, {})
    expect(status2).toBe('Locked')

    // 3. Available when prerequisite 'security-goals' is completed
    const status3 = getNodeStatus(
      'encoding-vs-encryption',
      { 'cryptography-fundamentals:intro-security-goals': true },
      {}
    )
    expect(status3).toBe('Available')

    // 4. Completed when self is completed
    const status4 = getNodeStatus(
      'encoding-vs-encryption',
      {
        'cryptography-fundamentals:intro-security-goals': true,
        'cryptography-fundamentals:encoding-vs-encryption': true,
      },
      {}
    )
    expect(status4).toBe('Completed')

    // 5. Custom node completion works
    const status5 = getNodeStatus('modular-arithmetic', {}, { 'modular-arithmetic': true })
    expect(status5).toBe('Completed')
  })
})
