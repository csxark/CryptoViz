'use client'

import { useEffect, useRef, useState } from 'react'
import { expandKey, processBlock } from '@/lib/cipher/symmetric/aes'

// A deliberately tiny, self-contained canvas demo of the classic "ECB penguin":
// encrypt an image's pixels block-by-block and render the ciphertext as an
// image. Under ECB, identical 16-byte plaintext blocks map to identical
// ciphertext blocks, so the picture's large uniform regions survive encryption.
// Under CTR (a stream mode) every block is masked with a fresh keystream block,
// so the output is indistinguishable from noise.

const SIZE = 128 // source image is 128x128 grayscale (1 byte per pixel)
const KEY = new Uint8Array([
  0x2b, 0x7e, 0x15, 0x16, 0x28, 0xae, 0xd2, 0xa6,
  0xab, 0xf7, 0x15, 0x88, 0x09, 0xcf, 0x4f, 0x3c,
])

function ecbEncrypt(src: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(src.length)
  const numBlocks = Math.ceil(src.length / 16)
  for (let b = 0; b < numBlocks; b++) {
    const block = new Uint8Array(16)
    block.set(src.subarray(b * 16, b * 16 + 16))
    out.set(processBlock(block, roundKeys, false), b * 16)
  }
  return out
}

function ctrEncrypt(src: Uint8Array, roundKeys: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(src.length)
  const counter = new Uint8Array(16) // nonce/counter starts at zero for the demo
  const numBlocks = Math.ceil(src.length / 16)
  for (let b = 0; b < numBlocks; b++) {
    const ks = processBlock(counter, roundKeys, false)
    for (let i = 0; i < 16 && b * 16 + i < src.length; i++) {
      out[b * 16 + i] = src[b * 16 + i] ^ ks[i]
    }
    for (let i = 15; i >= 0; i--) {
      counter[i] = (counter[i] + 1) & 0xff
      if (counter[i] !== 0) break
    }
  }
  return out
}

function grayToImageData(bytes: Uint8Array): ImageData {
  const img = new ImageData(SIZE, SIZE)
  for (let i = 0; i < SIZE * SIZE; i++) {
    const v = bytes[i]
    img.data[i * 4] = v
    img.data[i * 4 + 1] = v
    img.data[i * 4 + 2] = v
    img.data[i * 4 + 3] = 255
  }
  return img
}

function paint(canvas: HTMLCanvasElement | null, bytes: Uint8Array) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.putImageData(grayToImageData(bytes), 0, 0)
}

export default function EcbPenguin() {
  const originalRef = useRef<HTMLCanvasElement>(null)
  const ecbRef = useRef<HTMLCanvasElement>(null)
  const ctrRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      // Rasterize the sample image to a scratch canvas, then read grayscale bytes.
      const scratch = document.createElement('canvas')
      scratch.width = SIZE
      scratch.height = SIZE
      const sctx = scratch.getContext('2d')
      if (!sctx) {
        setError('Canvas 2D context unavailable in this browser.')
        return
      }
      sctx.fillStyle = '#ffffff'
      sctx.fillRect(0, 0, SIZE, SIZE)
      sctx.drawImage(img, 0, 0, SIZE, SIZE)
      const rgba = sctx.getImageData(0, 0, SIZE, SIZE).data

      const gray = new Uint8Array(SIZE * SIZE)
      for (let i = 0; i < SIZE * SIZE; i++) {
        // Luma from the RGB triplet.
        gray[i] = Math.round(
          0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2],
        )
      }

      const roundKeys = expandKey(KEY)
      paint(originalRef.current, gray)
      paint(ecbRef.current, ecbEncrypt(gray, roundKeys))
      paint(ctrRef.current, ctrEncrypt(gray, roundKeys))
    }
    img.onerror = () => setError('Could not load the sample image.')
    img.src = '/modes/ecb-sample.svg'
    return () => {
      cancelled = true
    }
  }, [])

  const panels: { label: string; ref: React.RefObject<HTMLCanvasElement | null>; caption: string }[] = [
    { label: 'Original', ref: originalRef, caption: 'The plaintext image.' },
    { label: 'AES-ECB', ref: ecbRef, caption: 'Structure leaks — identical blocks encrypt identically.' },
    { label: 'AES-CTR', ref: ctrRef, caption: 'Pure noise — every block gets a fresh keystream.' },
  ]

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">The ECB Penguin</h2>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        The same key encrypts the same image three ways. ECB encrypts each 16-byte block on its own,
        so the picture&apos;s flat regions produce repeating ciphertext blocks and the silhouette stays
        visible. A streaming mode like CTR masks every block differently, leaving nothing to see.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {panels.map((p) => (
            <figure key={p.label} className="flex flex-col items-center gap-2">
              <canvas
                ref={p.ref}
                role="img"
                aria-label={p.caption}
                width={SIZE}
                height={SIZE}
                className="h-40 w-40 rounded-lg border border-zinc-200 bg-white dark:border-zinc-700"
                style={{ imageRendering: 'pixelated' }}
              />
              <figcaption className="text-center">
                <span className="block font-mono text-xs font-semibold text-teal-600 dark:text-teal-400">
                  {p.label}
                </span>
                <span className="block text-[11px] leading-snug text-zinc-500 dark:text-zinc-500">
                  {p.caption}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
