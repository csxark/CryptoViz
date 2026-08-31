'use client'

import { useState } from 'react'

import { toByteArray, fromByteArray } from '@/lib/utils/encoding'
import { toBase32, fromBase32 } from '@exodus/bytes/base32.js'
import { toBase58, fromBase58 } from '@exodus/bytes/base58.js'
import { toBase85, fromBase85 } from '@/lib/encoding/base85'

export default function EncodingExplorer() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [encoding, setEncoding] = useState('Base16 (Hex)')
  const [mode, setMode] = useState('Encode')

  const handleConvert = () => {
    try {
      let result = ''

      if (encoding === 'Base16 (Hex)') {
        if (mode === 'Encode') {
          result = fromByteArray(toByteArray(input, 'utf8'), 'hex')
        } else {
          result = fromByteArray(toByteArray(input, 'hex'), 'utf8')
        }
      } else if (encoding === 'Base32') {
        if (mode === 'Encode') {
          result = toBase32(toByteArray(input, 'utf8'))
        } else {
          result = new TextDecoder().decode(fromBase32(input))
        }
      } else if (encoding === 'Base58') {
        if (mode === 'Encode') {
          result = toBase58(toByteArray(input, 'utf8'))
        } else {
          result = new TextDecoder().decode(fromBase58(input))
        }
      } else if (encoding === 'Base64') {
        if (mode === 'Encode') {
          result = fromByteArray(toByteArray(input, 'utf8'), 'base64')
        } else {
          result = fromByteArray(toByteArray(input, 'base64'), 'utf8')
        }
      } else if (encoding === 'Base85 (Ascii85)') {
        if (mode === 'Encode') {
          result = toBase85(toByteArray(input, 'utf8'))
        } else {
          result = new TextDecoder().decode(fromBase85(input))
        }
      } else if (encoding === 'URL') {
        result =
          mode === 'Encode'
            ? encodeURIComponent(input)
            : decodeURIComponent(input)
      }

      setOutput(result)
    } catch {
  let message = 'Failed to convert.'

  if (encoding === 'Base16 (Hex)') {
    message = 'Invalid hexadecimal input.'
  } else if (encoding === 'Base32') {
    message = 'Invalid Base32 input.'
  } else if (encoding === 'Base58') {
    message = 'Invalid Base58 input.'
  } else if (encoding === 'Base64') {
    message = 'Invalid Base64 input.'
  } else if (encoding === 'Base85 (Ascii85)') {
    message = 'Invalid Base85 input.'
  } else if (encoding === 'URL') {
    message = 'Invalid URL-encoded input.'
  }

  setOutput(message)
}
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <select
          aria-label="Select encoding scheme"
          value={encoding}
          onChange={(e) => setEncoding(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option>Base16 (Hex)</option>
          <option>Base32</option>
          <option>Base58</option>
          <option>Base64</option>
          <option>Base85 (Ascii85)</option>
          <option>URL</option>
        </select>

        <select
          aria-label="Select operation"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option>Encode</option>
          <option>Decode</option>
        </select>

        <button
          type="button"
          aria-label="Convert input"
          onClick={handleConvert}
          disabled={!input.trim()}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Convert
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900">
  <h3 className="mb-2 font-semibold">Encoding Guide</h3>

  <ul className="space-y-2 text-zinc-600 dark:text-zinc-300">
    <li>
      <strong>Base16 (Hex):</strong> Represents binary data using hexadecimal
      characters. Commonly used for hashes, debugging, and cryptography.
    </li>

    <li>
      <strong>Base32:</strong> Uses a limited character set and is commonly used
      for TOTP secrets and QR provisioning.
    </li>

    <li>
      <strong>Base58:</strong> Avoids visually similar characters (such as 0, O, I, and l)
      for compact and unambiguous binary-to-text representation.
    </li>

    <li>
      <strong>Base64:</strong> Encodes binary data into ASCII. Commonly used in
      APIs, JWTs, email attachments, and images.
    </li>

    <li>
      <strong>Base85 (Ascii85):</strong> Packs binary into a compact 85-character
      set. Used in PDF streams, PostScript, and Git binary diffs.
    </li>

    <li>
      <strong>URL Encoding:</strong> Escapes reserved URL characters so text can
      be safely transmitted in query parameters and URLs.
    </li>
  </ul>
</div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label
            htmlFor="encoding-input"
            className="text-lg font-semibold"
          >
            Input
          </label>

          <textarea
            id="encoding-input"
            rows={8}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setOutput('')
            }}
            placeholder="Enter text..."
            className="w-full rounded-xl border border-zinc-300 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-500 outline-none transition focus:border-teal-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
        </div>

        <div className="space-y-4">
          <label
            htmlFor="encoding-output"
            className="text-lg font-semibold"
          >
            Output
          </label>

          <textarea
            id="encoding-output"
            rows={8}
            value={output}
            readOnly
            placeholder="Encoded or decoded result..."
            className="w-full rounded-xl border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-900 placeholder:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
          />
        </div>
      </div>
    </section>
  )
}