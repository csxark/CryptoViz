'use client'

import { useMemo, useRef, useState } from 'react'
import { decodeAsn1, type Asn1Node, type Asn1ParseResult } from '@/lib/encoding/asn1'

/** A self-signed RSA-2048 certificate. Certificates are public by definition. */
const SAMPLE_CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDuTCCAqGgAwIBAgIUM9FSM29CjWz40vQMUryf8jsnynowDQYJKoZIhvcNAQEL
BQAwbDELMAkGA1UEBhMCSU4xDTALBgNVBAgMBFRlc3QxDTALBgNVBAcMBFRlc3Qx
EjAQBgNVBAoMCUNyeXB0b1ZpejESMBAGA1UECwwJRWR1Y2F0aW9uMRcwFQYDVQQD
DA5jcnlwdG92aXoudGVzdDAeFw0yNjA3MzAxMTE5NThaFw0zNjA3MjcxMTE5NTha
MGwxCzAJBgNVBAYTAklOMQ0wCwYDVQQIDARUZXN0MQ0wCwYDVQQHDARUZXN0MRIw
EAYDVQQKDAlDcnlwdG9WaXoxEjAQBgNVBAsMCUVkdWNhdGlvbjEXMBUGA1UEAwwO
Y3J5cHRvdml6LnRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCQ
2jZBXe6XUWo6flaDl3zVZXDpFMZvteRUcTAXmytXJamyKS3ds+ssM3vDAGkBCuBB
9Evc2bLgOoc6jmh89xoWXNUy85t2q/COFifVI7D0OEoWKWpNythUGYnSE5PSLNoS
qOnUHs8gXqD77NWHffe9CKhyo5iJnIQ3B/mit2ntb0t5cHxR9fr63A8K+/0NmDm1
tptB9qjZ5O0TS1qaF2IhjAvWDJxjFs37gGDhc4CCjnR5AEZl63vMyXBzY2xaJxnK
LTosKQQR+hlT6kU7fmz0mF/Zruyhr+66U+7AlUo/MIzEE/JwTmKFutO4g0xl5ove
dKpp32A43BAy+gNgAKXZAgMBAAGjUzBRMB0GA1UdDgQWBBTjozI7MjbcKfB17fol
keigiyfjdjAfBgNVHSMEGDAWgBTjozI7MjbcKfB17folkeigiyfjdjAPBgNVHRMB
Af8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAzu7G92hLqp9XaXPIUqJ1ijaeV
VJ62D9eeVwC1QLUdn/MhOBbu6FmkL7ai9JIH8CcSWmIh3sOmeFH4nu2YwoIl03fN
z6P5nQ6f30XYzn2npA/LuzuJ1jOjjQ7WP9HbSq6aATsoGwacEjPiFiz9Bq9hJXJu
CHFtSARODHWwEWuLK3fOQPoFIgtx4c9SKZeJhmWOE194CQmM07+7gASK5AG0BncB
92vpq8P7lLh7UgzOAM6HMactoWCrRPy5iYtVk7nYQj0RsShveV7yF8/3PEnpAbGm
57XLZYmcecV2/tnCC219DIBIjcVqirA7CYv7phFrJ1hQRtfwLL11nwMgTy1i
-----END CERTIFICATE-----`

/** An Ed25519 SubjectPublicKeyInfo — 44 bytes, small enough to read whole. */
const SAMPLE_SPKI = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAmG1/Uuly/gMpkcjknF7uTc9LyYMjAcXZWbCcFbAy9QI=
-----END PUBLIC KEY-----`

/** A PKCS#8 wrapper whose key bytes are all zero — the structure, not a secret. */
const SAMPLE_PKCS8 = '302e020100300506032b657004220420' + '00'.repeat(32)

/** Deliberately BER-not-DER: indefinite length, unsorted SET, non-minimal INTEGER. */
const SAMPLE_BER = '3080310602010202010102020001' + '0000'

const SAMPLES: { id: string; label: string; description: string; value: string }[] = [
  {
    id: 'cert',
    label: 'X.509 certificate',
    description: 'Self-signed RSA-2048, with v3 extensions',
    value: SAMPLE_CERTIFICATE,
  },
  {
    id: 'spki',
    label: 'Ed25519 public key',
    description: 'SubjectPublicKeyInfo, 44 bytes',
    value: SAMPLE_SPKI,
  },
  {
    id: 'pkcs8',
    label: 'PKCS#8 layout',
    description: 'PrivateKeyInfo shape with a zeroed key',
    value: SAMPLE_PKCS8,
  },
  {
    id: 'ber',
    label: 'Invalid DER',
    description: 'BER quirks that DER forbids',
    value: SAMPLE_BER,
  },
]

const CARD =
  'rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
const HEADING = 'mb-3 text-lg font-semibold text-zinc-900 dark:text-white'
const MUTED = 'text-sm text-zinc-600 dark:text-zinc-400'

/** Byte-role colouring for the hex pane. */
type ByteRole = 'tag' | 'length' | 'content' | 'none'

export default function Asn1Decoder() {
  const [input, setInput] = useState(SAMPLE_CERTIFICATE)
  const [selectedOffset, setSelectedOffset] = useState<number | null>(null)
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set())

  const { result, error } = useMemo((): {
    result: (Asn1ParseResult & { sourceFormat: 'pem' | 'hex'; pemLabel?: string }) | null
    error: string | null
  } => {
    try {
      return { result: decodeAsn1(input), error: null }
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : 'Could not decode input.' }
    }
  }, [input])

  /** Flatten the tree so the hex pane can look a byte's owning node up by offset. */
  const flatNodes = useMemo(() => {
    const out: Asn1Node[] = []
    const walk = (nodes: Asn1Node[]) => {
      for (const node of nodes) {
        out.push(node)
        if (node.children) walk(node.children)
      }
    }
    if (result) walk(result.nodes)
    return out
  }, [result])

  const selectedNode = useMemo(
    () => flatNodes.find((n) => n.offset === selectedOffset) ?? null,
    [flatNodes, selectedOffset]
  )

  /**
   * Role of each byte within the *selected* node only. Highlighting every
   * node at once would be noise; the point is to connect one tree row to its
   * exact bytes.
   */
  const byteRoles = useMemo(() => {
    if (!result) return []
    const roles: ByteRole[] = new Array(result.byteLength).fill('none')
    if (!selectedNode) return roles

    const { offset, tagLength, headerLength, contentLength } = selectedNode

    // tagLength comes from the parser, so a multi-byte tag alongside a
    // multi-byte length is split correctly rather than guessed at.
    for (let i = 0; i < headerLength; i++) {
      if (offset + i < roles.length) roles[offset + i] = i < tagLength ? 'tag' : 'length'
    }
    for (let i = 0; i < contentLength; i++) {
      const index = offset + headerLength + i
      if (index < roles.length) roles[index] = 'content'
    }
    return roles
  }, [result, selectedNode])

  const hexBytes = useMemo(() => {
    if (!result) return []
    const out: string[] = []
    for (let i = 0; i < result.derHex.length; i += 2) out.push(result.derHex.slice(i, i + 2))
    return out
  }, [result])

  function toggleCollapsed(offset: number) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(offset)) next.delete(offset)
      else next.add(offset)
      return next
    })
  }

  /**
   * The nodes a keyboard user can currently reach, in visual order. Children of
   * a collapsed node are excluded, which is what ArrowUp/ArrowDown must follow.
   */
  const visibleNodes = useMemo(() => {
    const out: Asn1Node[] = []
    const walk = (nodes: Asn1Node[]) => {
      for (const node of nodes) {
        out.push(node)
        if (node.children?.length && !collapsed.has(node.offset)) walk(node.children)
      }
    }
    if (result) walk(result.nodes)
    return out
  }, [result, collapsed])

  // Roving tabindex: exactly one treeitem is in the tab order at a time, and
  // the arrow keys move focus within the tree. This is the ARIA tree pattern —
  // without it, role="tree" would be a promise the widget does not keep.
  const rowRefs = useRef(new Map<number, HTMLLIElement>())
  const [focusedOffset, setFocusedOffset] = useState<number | null>(null)

  const activeOffset =
    focusedOffset !== null && visibleNodes.some((n) => n.offset === focusedOffset)
      ? focusedOffset
      : (visibleNodes[0]?.offset ?? null)

  function focusOffset(offset: number) {
    setFocusedOffset(offset)
    rowRefs.current.get(offset)?.focus()
  }

  function handleTreeKeyDown(event: React.KeyboardEvent, node: Asn1Node) {
    const index = visibleNodes.findIndex((n) => n.offset === node.offset)
    if (index === -1) return

    const hasChildren = Boolean(node.children?.length)
    const isCollapsed = collapsed.has(node.offset)

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (index + 1 < visibleNodes.length) focusOffset(visibleNodes[index + 1].offset)
        break

      case 'ArrowUp':
        event.preventDefault()
        if (index > 0) focusOffset(visibleNodes[index - 1].offset)
        break

      case 'ArrowRight':
        event.preventDefault()
        if (hasChildren && isCollapsed) toggleCollapsed(node.offset)
        else if (hasChildren && index + 1 < visibleNodes.length) {
          focusOffset(visibleNodes[index + 1].offset)
        }
        break

      case 'ArrowLeft':
        event.preventDefault()
        if (hasChildren && !isCollapsed) {
          toggleCollapsed(node.offset)
        } else {
          // Walk back to the nearest shallower node — this node's parent.
          for (let i = index - 1; i >= 0; i--) {
            if (visibleNodes[i].depth < node.depth) {
              focusOffset(visibleNodes[i].offset)
              break
            }
          }
        }
        break

      case 'Home':
        event.preventDefault()
        if (visibleNodes.length > 0) focusOffset(visibleNodes[0].offset)
        break

      case 'End':
        event.preventDefault()
        if (visibleNodes.length > 0) focusOffset(visibleNodes[visibleNodes.length - 1].offset)
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        setSelectedOffset(selectedOffset === node.offset ? null : node.offset)
        break

      default:
        break
    }
  }

  function renderNode(node: Asn1Node, index: number): React.ReactNode {
    const hasChildren = Boolean(node.children?.length)
    const isCollapsed = collapsed.has(node.offset)
    const isSelected = selectedOffset === node.offset

    return (
      <li
        key={`${node.offset}-${index}`}
        ref={(element) => {
          if (element) rowRefs.current.set(node.offset, element)
          else rowRefs.current.delete(node.offset)
        }}
        role="treeitem"
        aria-selected={isSelected}
        aria-expanded={hasChildren ? !isCollapsed : undefined}
        aria-level={node.depth + 1}
        tabIndex={activeOffset === node.offset ? 0 : -1}
        onKeyDown={(event) => handleTreeKeyDown(event, node)}
        onFocus={() => setFocusedOffset(node.offset)}
        onClick={(event) => {
          // Only act on this row, not on a click bubbling up from a descendant.
          event.stopPropagation()
          setSelectedOffset(isSelected ? null : node.offset)
          focusOffset(node.offset)
        }}
        className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
      >
        <div
          className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded px-2 py-1 ${
            isSelected ? 'bg-teal-100 dark:bg-teal-900/40' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
          style={{ marginLeft: `${node.depth * 1.25}rem` }}
        >
          <span
            className="w-4 shrink-0 font-mono text-xs text-zinc-400"
            aria-hidden="true"
            onClick={(event) => {
              if (!hasChildren) return
              event.stopPropagation()
              toggleCollapsed(node.offset)
              focusOffset(node.offset)
            }}
          >
            {hasChildren ? (isCollapsed ? '▸' : '▾') : ''}
          </span>

          <span className="font-mono text-sm font-semibold text-teal-700 dark:text-teal-400">
            {node.typeName}
          </span>
          <span className="font-mono text-xs text-zinc-400">
            @{node.offset} · hdr {node.headerLength} · len {node.contentLength}
          </span>

          {node.value !== undefined && (
            <span className="break-all font-mono text-xs text-zinc-700 dark:text-zinc-300">
              {node.value.length > 90 ? `${node.value.slice(0, 90)}…` : node.value}
            </span>
          )}

          {node.oidName && (
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              {node.oidName}
            </span>
          )}

          {node.warnings.length > 0 && (
            <span
              title={node.warnings.join('\n')}
              className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
            >
              {node.warnings.length} note{node.warnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {hasChildren && !isCollapsed && (
          <ul role="group">{node.children!.map((child, i) => renderNode(child, i))}</ul>
        )}
      </li>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------------- */}
      {/* Input                                                             */}
      {/* ---------------------------------------------------------------- */}
      <section className={CARD}>
        <h2 className={HEADING}>PEM or raw DER hex</h2>
        <p className={`mb-4 ${MUTED}`}>
          Paste a certificate, a public key, or any DER blob. The format is detected automatically —
          PEM armour is stripped and Base64-decoded, and bare hex is taken as-is.
        </p>

        <div className="mb-3 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => {
                setInput(sample.value)
                setSelectedOffset(null)
                setCollapsed(new Set())
              }}
              title={sample.description}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <label htmlFor="asn1-input" className="sr-only">
          PEM block or DER hex to decode
        </label>
        <textarea
          id="asn1-input"
          className="h-40 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setSelectedOffset(null)
          }}
          spellCheck={false}
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {result && (
          <p className={`mt-3 ${MUTED}`}>
            Decoded {result.byteLength} bytes from{' '}
            {result.sourceFormat === 'pem' ? `a ${result.pemLabel} PEM block` : 'raw hex'}.
          </p>
        )}
      </section>

      {result && (
        <>
          {/* -------------------------------------------------------------- */}
          {/* Structure summary                                               */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>
              {result.structure.type}
              {result.structure.confidence !== 'none' && (
                <span className="ml-2 rounded bg-teal-100 px-2 py-0.5 text-xs font-normal text-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
                  {result.structure.confidence} confidence
                </span>
              )}
            </h2>
            <p className={`mb-4 ${MUTED}`}>{result.structure.reason}</p>

            {result.structure.fields.length > 0 && (
              <dl className="grid gap-3 sm:grid-cols-2">
                {result.structure.fields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      {field.label}
                    </dt>
                    <dd className="break-all font-mono text-sm text-zinc-900 dark:text-white">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* TLV tree                                                        */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>Tag-Length-Value tree</h2>
            <p className={`mb-4 ${MUTED}`}>
              Select any element to highlight its exact bytes in the hex dump below — tag, length
              and content are tinted separately. That mapping is the whole idea: DER is nothing but
              these three fields, nested.
            </p>
            <p className={`mb-4 ${MUTED}`}>
              Keyboard: <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">↑</kbd>{' '}
              <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">↓</kbd> move,{' '}
              <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">→</kbd> expand,{' '}
              <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">←</kbd> collapse
              or go to parent,{' '}
              <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">Home</kbd>/
              <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">End</kbd> jump,{' '}
              <kbd className="rounded border border-zinc-300 px-1 text-xs dark:border-zinc-700">Enter</kbd> select.
            </p>

            <ul role="tree" aria-label="ASN.1 structure" className="space-y-0.5 overflow-x-auto">
              {result.nodes.map((node, i) => renderNode(node, i))}
            </ul>
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Hex pane                                                        */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>Hex dump</h2>

            <div className="mb-4 flex flex-wrap gap-4 text-xs text-zinc-500 dark:text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-teal-500" /> tag
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-amber-500" /> length
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded bg-sky-400" /> content
              </span>
              <span>
                {selectedNode
                  ? `Showing ${selectedNode.typeName} at byte ${selectedNode.offset}`
                  : 'Select an element above to highlight its bytes'}
              </span>
            </div>

            <div className="max-h-96 overflow-auto rounded-md bg-zinc-50 p-3 dark:bg-zinc-950/50">
              <div className="flex flex-wrap gap-x-1 gap-y-0.5 font-mono text-xs">
                {hexBytes.map((byte, i) => {
                  const role = byteRoles[i] ?? 'none'
                  const className =
                    role === 'tag'
                      ? 'bg-teal-500 text-white'
                      : role === 'length'
                        ? 'bg-amber-500 text-white'
                        : role === 'content'
                          ? 'bg-sky-400 text-white dark:bg-sky-600'
                          : 'text-zinc-500 dark:text-zinc-500'

                  return (
                    <span key={i} title={`byte ${i}`} className={`rounded px-1 ${className}`}>
                      {byte}
                    </span>
                  )
                })}
              </div>
            </div>

            {selectedNode && (
              <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  ['Tag byte', `0x${selectedNode.tagByte.toString(16).padStart(2, '0')}`],
                  ['Class', selectedNode.tagClass],
                  ['Form', selectedNode.constructed ? 'constructed' : 'primitive'],
                  ['Tag number', String(selectedNode.tagNumber)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      {label}
                    </dt>
                    <dd className="font-mono text-sm text-zinc-900 dark:text-white">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          {/* -------------------------------------------------------------- */}
          {/* Warnings                                                        */}
          {/* -------------------------------------------------------------- */}
          <section className={CARD}>
            <h2 className={HEADING}>
              DER strictness{' '}
              <span className="text-sm font-normal text-zinc-500">
                ({result.warnings.length} note{result.warnings.length === 1 ? '' : 's'})
              </span>
            </h2>

            {result.warnings.length === 0 ? (
              <p className={MUTED}>
                No strictness violations. Every length is definite and minimal, every INTEGER is
                minimally padded, and every SET is sorted — this is well-formed DER.
              </p>
            ) : (
              <ul className="space-y-3">
                {result.warnings.map((warning, i) => (
                  <li key={i} className="border-l-2 border-amber-500 pl-4">
                    <p className="font-mono text-xs text-zinc-500 dark:text-zinc-500">
                      {warning.path}
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{warning.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
