'use client'


export type PaddingSchemeId = 'pkcs7' | 'oaep' | 'pss' | 'pkcs1_v15_enc' | 'pkcs1_v15_sig' | 'none'

interface PaddingVisualizerProps {
  scheme: PaddingSchemeId
  inputString?: string
  blockSize?: number // mostly for pkcs7
}

export default function PaddingVisualizer({ scheme, inputString = 'SECRET', blockSize = 16 }: PaddingVisualizerProps) {
  // Common tailwind classes for blocks
  const blockClass = "flex flex-col items-center justify-center p-3 text-center border rounded-md shadow-sm"
  const labelClass = "text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70"
  const valueClass = "font-mono text-sm sm:text-base font-semibold tabular-nums break-all"

  if (scheme === 'pkcs7' || scheme === 'none') {
    const encoder = new TextEncoder()
    const inputBytes = encoder.encode(inputString)
    let paddedBytes: Uint8Array

    if (scheme === 'pkcs7') {
      const padLen = blockSize - (inputBytes.length % blockSize)
      paddedBytes = new Uint8Array(inputBytes.length + padLen)
      paddedBytes.set(inputBytes)
      paddedBytes.fill(padLen, inputBytes.length)
    } else {
      paddedBytes = inputBytes
    }

    return (
      <div className="space-y-4">
        <div 
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(2.5rem, 1fr))` }}
          aria-label={`${scheme === 'pkcs7' ? 'PKCS#7 Padded' : 'Unpadded'} bytes`}
        >
          {Array.from(paddedBytes).map((b, i) => {
            const isPadding = scheme === 'pkcs7' && i >= inputBytes.length
            return (
              <div 
                key={i}
                title={isPadding ? `Padding Byte: 0x${b.toString(16).padStart(2, '0')}` : `Data Byte: ${String.fromCharCode(b)}`}
                className={`
                  flex aspect-square items-center justify-center rounded-md font-mono text-xs sm:text-sm font-semibold tabular-nums
                  ${isPadding 
                    ? 'bg-teal-500/20 text-teal-700 border border-teal-500/30 dark:bg-teal-500/30 dark:text-teal-200' 
                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                  }
                `}
              >
                {b.toString(16).padStart(2, '0').toUpperCase()}
              </div>
            )
          })}
        </div>
        {scheme === 'pkcs7' && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {paddedBytes.length - inputBytes.length} bytes of padding added to reach a multiple of the {blockSize}-byte block size.
          </p>
        )}
      </div>
    )
  }

  // Conceptual visualizations for Asymmetric Padding
  if (scheme === 'oaep') {
    return (
      <div className="flex flex-col md:flex-row gap-2" aria-label="Conceptual diagram of RSA-OAEP padded block">
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Prefix</span>
          <span className={valueClass}>0x00</span>
        </div>
        <div className={`${blockClass} bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-200 flex-1`}>
          <span className={labelClass}>Masked Seed (Hash Size)</span>
          <span className={valueClass}>seed ⊕ MGF(maskedDB)</span>
        </div>
        <div className={`${blockClass} bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-200 flex-[2]`}>
          <span className={labelClass}>Masked Data Block (DB)</span>
          <span className={valueClass}>DB ⊕ MGF(seed)</span>
        </div>
      </div>
    )
  }

  if (scheme === 'pss') {
    return (
      <div className="flex flex-col md:flex-row gap-2" aria-label="Conceptual diagram of RSA-PSS encoded message">
        <div className={`${blockClass} bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-200 flex-[2]`}>
          <span className={labelClass}>Masked Data Block</span>
          <span className={valueClass}>maskedDB</span>
        </div>
        <div className={`${blockClass} bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-200 flex-1`}>
          <span className={labelClass}>Hash (H)</span>
          <span className={valueClass}>Hash(Padding | mHash | salt)</span>
        </div>
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Trailer</span>
          <span className={valueClass}>0xBC</span>
        </div>
      </div>
    )
  }

  if (scheme === 'pkcs1_v15_enc') {
    return (
      <div className="flex flex-col md:flex-row gap-2" aria-label="Conceptual diagram of PKCS#1 v1.5 Encryption Padding">
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Prefix</span>
          <span className={valueClass}>0x00</span>
        </div>
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Block Type</span>
          <span className={valueClass}>0x02</span>
        </div>
        <div className={`${blockClass} bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 flex-1`}>
          <span className={labelClass}>Padding (PS)</span>
          <span className={valueClass}>Non-zero Random Bytes</span>
        </div>
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Separator</span>
          <span className={valueClass}>0x00</span>
        </div>
        <div className={`${blockClass} bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-200 flex-[1.5]`}>
          <span className={labelClass}>Message (M)</span>
          <span className={valueClass}>{inputString}</span>
        </div>
      </div>
    )
  }

  if (scheme === 'pkcs1_v15_sig') {
    return (
      <div className="flex flex-col md:flex-row gap-2" aria-label="Conceptual diagram of PKCS#1 v1.5 Signature Padding">
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Prefix</span>
          <span className={valueClass}>0x00</span>
        </div>
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Block Type</span>
          <span className={valueClass}>0x01</span>
        </div>
        <div className={`${blockClass} bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 flex-1`}>
          <span className={labelClass}>Padding (PS)</span>
          <span className={valueClass}>0xFF 0xFF ... 0xFF</span>
        </div>
        <div className={`${blockClass} bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700`}>
          <span className={labelClass}>Separator</span>
          <span className={valueClass}>0x00</span>
        </div>
        <div className={`${blockClass} bg-teal-50 border-teal-200 text-teal-900 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-200 flex-[1.5]`}>
          <span className={labelClass}>Digest Info & Hash (T)</span>
          <span className={valueClass}>ASN.1 Encoded Hash</span>
        </div>
      </div>
    )
  }

  return null
}
