'use client';

import { useEffect, useMemo, useRef, useState } from 'react'
import { type AttackStep, type OracleMode, BLOCK_SIZE } from '@/lib/attacks/paddingOracle'
import { useAttackWorker } from '@/hooks/useAttackWorker'
import { toByteArray, fromByteArray } from '@/lib/utils'
import AttackControlBar from './AttackControlBar'
import OracleQueryLogViewer, { type OracleLogEntry } from './OracleQueryLogViewer'
import AttackMemoryGrid from './AttackMemoryGrid'
import type { InteractiveAttackStep } from '@/lib/attacks/interactiveStepper'

function hexToBytes(hex: string) {
  const clean = hex.trim().replace(/\s+/g, '')
  if (clean.length % 2 || !/^[0-9a-fA-F]+$/.test(clean)) throw new Error('Value must be valid hexadecimal.')
  return toByteArray(clean, 'hex')
}
const bytesToHex = (bytes: Uint8Array) => fromByteArray(bytes, 'hex')
const printable = (bytes: Uint8Array) => Array.from(bytes).map(b => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').join('')

export default function PaddingOracleSimulator() {
  const [key, setKey] = useState('')
  const [iv, setIv] = useState('')
  const [ciphertext, setCiphertext] = useState('')
  const [mode, setMode] = useState<OracleMode>('vulnerable')
  const [steps, setSteps] = useState<AttackStep[]>([])
  const [cursor, setCursor] = useState(-1)
  const [running, setRunning] = useState(false)
  const [recovered, setRecovered] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const { recoverPlaintextConcurrently, cancel } = useAttackWorker()

  const interactiveSteps = useMemo<InteractiveAttackStep[]>(() => {
    const memory = new Uint8Array(BLOCK_SIZE)
    return steps.map((s, i) => {
      if (s.recoveredPlaintextByte !== undefined) memory[BLOCK_SIZE - s.byteIndexFromEnd] = s.recoveredPlaintextByte
      const recovered = s.recoveredPlaintextByte !== undefined
      const pos = BLOCK_SIZE - s.byteIndexFromEnd
      const formula = recovered
        ? `P[${pos}] = I[${pos}] ⊕ C[${pos}] = 0x${s.recoveredIntermediateByte!.toString(16).padStart(2,'0')} ⊕ C[${pos}]`
        : undefined
      return {
        id: `${i}-${s.blockIndex}-${s.byteIndexFromEnd}-${s.guess}`,
        kind: 'query',
        label: `Block ${s.blockIndex}, byte ${pos}`,
        detail: `C' byte guess 0x${s.guess.toString(16).padStart(2,'0')} → ${s.isValidPadding ? 'Valid padding' : 'Invalid padding'}`,
        status: s.isValidPadding ? 'valid' : 'invalid',
        byteIndex: pos, guess: s.guess,
        recoveredByte: s.recoveredPlaintextByte, formula,
        memory: Array.from(memory).map((value,index)=>({index,value:value||undefined,status:value?'recovered':index===pos?'testing':'unknown',guess:index===pos?s.guess:undefined})),
      }
    })
  }, [steps])

  const current = interactiveSteps[cursor]
  const log: OracleLogEntry[] = interactiveSteps.slice(0, cursor + 1).slice(-200).map((s, i) => ({
    index: i, label: s.status === 'valid' ? 'VALID' : 'INVALID', detail: s.detail, status: s.status,
  }))

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const play = () => {
    if (!steps.length) return
    setRunning(true)
    if (timer.current) clearInterval(timer.current)
    timer.current = setInterval(() => setCursor(c => {
      if (c >= steps.length - 1) { if (timer.current) clearInterval(timer.current); setRunning(false); return c }
      return c + 1
    }), 120)
  }
  const pause = () => { if (timer.current) clearInterval(timer.current); setRunning(false) }

  async function runAttack() {
    pause(); setError(null); setRecovered(null); setSteps([]); setCursor(-1)
    try {
      const ivBytes = hexToBytes(iv), cipherBytes = hexToBytes(ciphertext)
      if (ivBytes.length !== BLOCK_SIZE) throw new Error(`IV must be exactly ${BLOCK_SIZE} bytes.`)
      if (!cipherBytes.length || cipherBytes.length % BLOCK_SIZE) throw new Error(`Ciphertext must be a positive multiple of ${BLOCK_SIZE} bytes.`)
      const collected: AttackStep[] = []
      const result = await recoverPlaintextConcurrently(key, ivBytes, cipherBytes, mode, step => collected.push(step))
      setSteps(collected)
      setRecovered(bytesToHex(result.plaintext))
      setCursor(-1)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
  }

  const stop = () => { pause(); cancel() }

  return <div className="flex max-w-4xl flex-col gap-5">
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20">
      <strong>Educational simulation only.</strong> All queries stay inside CryptoViz's local sandbox.
    </div>
    <div className="grid gap-3">
      <label className="text-sm">Target key<input className="mt-1 w-full rounded border px-2 py-2 font-mono" value={key} onChange={e=>setKey(e.target.value)} placeholder="16/24/32-byte hex key or passphrase" /></label>
      <label className="text-sm">IV (hex)<input className="mt-1 w-full rounded border px-2 py-2 font-mono" value={iv} onChange={e=>setIv(e.target.value)} /></label>
      <label className="text-sm">Target ciphertext (hex)<textarea className="mt-1 w-full rounded border px-2 py-2 font-mono" rows={3} value={ciphertext} onChange={e=>setCiphertext(e.target.value)} /></label>
      <div className="flex gap-4 text-sm"><label><input type="radio" checked={mode==='vulnerable'} onChange={()=>setMode('vulnerable')} /> Vulnerable oracle</label><label><input type="radio" checked={mode==='fixed'} onChange={()=>setMode('fixed')} /> Fixed oracle</label></div>
      <div><button onClick={runAttack} disabled={running} className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{running?'Generating trace…':'Prepare interactive attack'}</button>{error&&<p className="mt-2 text-sm text-red-600">{error}</p>}</div>
    </div>
    {steps.length>0 && <div className="space-y-4">
      <AttackControlBar running={running} canPrevious={cursor>=0} canNext={cursor<steps.length-1} onPlay={play} onPause={pause} onPrevious={()=>setCursor(c=>Math.max(-1,c-1))} onNext={()=>setCursor(c=>Math.min(steps.length-1,c+1))} onReset={()=>{pause();setCursor(-1)}} />
      <div className="text-xs text-zinc-500">Query {Math.max(0,cursor+1)} / {steps.length}</div>
      {current?.formula && <div className="rounded-lg border border-cyan-300 bg-cyan-50 p-4 font-mono text-sm text-cyan-950 dark:bg-cyan-950/20 dark:text-cyan-200"><strong>Derivation:</strong> {current.formula} → recovered <strong>0x{current.recoveredByte!.toString(16).padStart(2,'0')}</strong></div>}
      <AttackMemoryGrid bytes={current?.memory ?? Array.from({length:16},(_,index)=>({index,status:'unknown' as const}))} />
      <OracleQueryLogViewer entries={log} />
      {recovered && cursor===steps.length-1 && <div className="rounded border p-3"><div className="text-xs uppercase text-zinc-500">Recovered plaintext</div><code>{recovered}</code><div className="font-mono text-sm">{printable(hexToBytes(recovered))}</div></div>}
    </div>}
  </div>
}
