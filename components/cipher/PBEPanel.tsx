'use client'

import { useState } from 'react'
import { pbeEncrypt, pbeDecrypt, PbePayload } from '@/lib/cipher/pbe'

type Mode = 'encrypt' | 'decrypt'

export default function PBEPanel() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [password, setPassword] = useState('')
  const [plaintext, setPlaintext] = useState('')
  const [payloadInput, setPayloadInput] = useState('')
  const [iterations, setIterations] = useState(100_000)
  const [hash, setHash] = useState<'SHA-256' | 'SHA-512'>('SHA-256')
  const [result, setResult] = useState<{
    payload?: PbePayload
    plaintext?: string
    derivedKeyHex?: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleRun() {
    setError(null)
    setLoading(true)
    setResult(null)
    try {
      if (mode === 'encrypt') {
        const { payload, derivedKeyHex } = await pbeEncrypt(plaintext, password, {
          iterations,
          hash,
        })
        setResult({ payload, derivedKeyHex })
      } else {
        const parsed: PbePayload = JSON.parse(payloadInput)
        const { plaintext: recovered, derivedKeyHex } = await pbeDecrypt(parsed, password)
        setResult({ plaintext: recovered, derivedKeyHex, payload: parsed })
   }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex gap-2">
        <button
          className={`px-3 py-1 rounded ${mode === 'encrypt' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          onClick={() => setMode('encrypt')}
        >
          Encrypt
        </button>
        <button
          className={`px-3 py-1 rounded ${mode === 'decrypt' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          onClick={() => setMode('decrypt')}
        >
          Decrypt
        </button>
      </div>

      <div>
        <label className="text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mt-1 rounded border px-3 py-2 bg-background"
          placeholder="Enter a password"
        />
      </div>

      {mode === 'encrypt' ? (
        <div>
          <label className="text-sm font-medium">Plaintext</label>
          <textarea
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            className="w-full mt-1 rounded border px-3 py-2 bg-background"
            rows={3}
          />
        </div>
      ) : (
        <div>
          <label className="text-sm font-medium">Payload (JSON)</label>
          <textarea
            value={payloadInput}
            onChange={(e) => setPayloadInput(e.target.value)}
            className="w-full mt-1 rounded border px-3 py-2 bg-background font-mono text-xs"
            rows={5}
            placeholder='{"algorithm":"AES-256-CBC","kdf":"PBKDF2",...}'
          />
        </div>
      )}

      {mode === 'encrypt' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Iterations</label>
            <input
              type="number"
              value={iterations}
              onChange={(e) => setIterations(Number(e.target.value))}
              min={10_000}
              max={5_000_000}
              step={10_000}
              className="w-full mt-1 rounded border px-2 py-1 bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Hash</label>
            <select
              value={hash}
              onChange={(e) => setHash(e.target.value as 'SHA-256' | 'SHA-512')}
              className="w-full mt-1 rounded border px-2 py-1 bg-background text-sm"
            >
              <option value="SHA-256">SHA-256</option>
              <option value="SHA-512">SHA-512</option>
            </select>
          </div>
        </div>
      )}

      <button
        onClick={handleRun}
        disabled={loading || !password || (mode === 'encrypt' ? !plaintext : !payloadInput)}
        className="w-full rounded bg-primary text-primary-foreground py-2 disabled:opacity-50"
      >
        {loading ? 'Deriving key…' : mode === 'encrypt' ? 'Derive Key & Encrypt' : 'Derive Key & Decrypt'}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {result && (
        <div className="space-y-2 rounded border border-border bg-muted/50 p-3">
          <h4 className="text-sm font-semibold">Derivation Flow (educational)</h4>
          <div className="text-xs font-mono space-y-1 break-all">
            <div><span className="text-muted-foreground">Password:</span> {'•'.repeat(password.length)}</div>
            {result.payload && (
              <>
                <div><span className="text-muted-foreground">Salt:</span> {result.payload.salt}</div>
                <div><span className="text-muted-foreground">Iterations:</span> {result.payload.iterations}</div>
              </>
            )}
            {result.derivedKeyHex && (
              <div><span className="text-muted-foreground">Derived Key:</span> {result.derivedKeyHex}</div>
            )}
          </div>

          {result.payload && mode === 'encrypt' && (
            <>
              <h4 className="text-sm font-semibold pt-2">Exportable Payload</h4>
              <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </>
          )}
          {result.plaintext !== undefined && (
            <>
              <h4 className="text-sm font-semibold pt-2">Recovered Plaintext</h4>
              <p className="text-sm bg-background rounded p-2">{result.plaintext}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}