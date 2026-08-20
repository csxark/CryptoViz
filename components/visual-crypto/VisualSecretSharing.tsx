'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  createEmptyGrid,
  createPresetGrid,
  generateNaorShamirShares,
  computeOpticalOverlay,
  type GridPreset,
  type SubpixelShareResult,
} from '@/lib/crypto/naorShamir'
import Card from '@/components/ui/Card'

export default function VisualSecretSharing() {
  const [grid, setGrid] = useState<boolean[][]>(() => createPresetGrid('C', 32, 32))
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawMode, setDrawMode] = useState<boolean>(true) // true = draw black, false = erase
  const [shares, setShares] = useState<SubpixelShareResult | null>(null)
  const [overlayOffset, setOverlayOffset] = useState<number>(100) // % offset (0% = perfectly aligned over Share 1)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const share1CanvasRef = useRef<HTMLCanvasElement | null>(null)
  const share2CanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)

  // Generate shares whenever grid changes
  const handleGenerateShares = useCallback(() => {
    const res = generateNaorShamirShares(grid)
    setShares(res)
  }, [grid])

  useEffect(() => {
    handleGenerateShares()
  }, [handleGenerateShares])

  // Draw grid onto share canvases
  useEffect(() => {
    if (!shares) return

    const drawGridToCanvas = (canvas: HTMLCanvasElement | null, gridData: boolean[][]) => {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const subH = gridData.length
      const subW = gridData[0].length
      const cellSize = canvas.width / subW

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = '#09090B'
      for (let r = 0; r < subH; r++) {
        for (let c = 0; c < subW; c++) {
          if (gridData[r][c]) {
            ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize)
          }
        }
      }
    }

    drawGridToCanvas(share1CanvasRef.current, shares.share1)
    drawGridToCanvas(share2CanvasRef.current, shares.share2)

    // Render optical combined overlay canvas
    if (overlayCanvasRef.current) {
      const combined = computeOpticalOverlay(shares.share1, shares.share2)
      drawGridToCanvas(overlayCanvasRef.current, combined)
    }
  }, [shares])

  const handleCellClick = (r: number, c: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[r][c] = drawMode
      return next
    })
  }

  const handleMouseEnterCell = (r: number, c: number) => {
    if (!isDrawing) return
    setGrid((prev) => {
      const next = prev.map((row) => [...row])
      next[r][c] = drawMode
      return next
    })
  }

  const loadPreset = (preset: GridPreset) => {
    setGrid(createPresetGrid(preset, 32, 32))
  }

  const clearGrid = () => {
    setGrid(createEmptyGrid(32, 32))
  }

  const invertGrid = () => {
    setGrid((prev) => prev.map((row) => row.map((val) => !val)))
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Drawer canvas section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              1. Secret Binary Canvas (32 × 32)
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDrawMode(true)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  drawMode
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                Pencil
              </button>
              <button
                type="button"
                onClick={() => setDrawMode(false)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  !drawMode
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400'
                }`}
              >
                Eraser
              </button>
            </div>
          </div>

          <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
            Draw your secret image or select a preset. Each pixel will be expanded into a 2×2 subpixel matrix across two transparency shares.
          </p>

          <div
            className="mx-auto aspect-square w-full max-w-[320px] select-none grid grid-cols-32 border border-zinc-300 dark:border-zinc-700 bg-white"
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
          >
            {grid.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`cell-${r}-${c}`}
                  onMouseDown={() => handleCellClick(r, c)}
                  onMouseEnter={() => handleMouseEnterCell(r, c)}
                  className={`h-full w-full cursor-pointer transition-colors ${
                    val ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-white hover:bg-zinc-100 dark:hover:bg-zinc-200'
                  }`}
                />
              ))
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-500">Presets:</span>
              <button
                type="button"
                onClick={() => loadPreset('C')}
                className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              >
                'C'
              </button>
              <button
                type="button"
                onClick={() => loadPreset('X')}
                className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              >
                'X'
              </button>
              <button
                type="button"
                onClick={() => loadPreset('lock')}
                className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Lock
              </button>
              <button
                type="button"
                onClick={() => loadPreset('grid')}
                className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
              >
                Grid
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={invertGrid}
                className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Invert
              </button>
              <button
                type="button"
                onClick={clearGrid}
                className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Individual Share Inspection */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 lg:col-span-6">
          <h3 className="mb-2 text-base font-bold text-zinc-900 dark:text-white">
            2. Generated Transparency Slides (64 × 64 Subpixels)
          </h3>
          <p className="mb-6 text-xs text-zinc-500 dark:text-zinc-400">
            Inspecting Share 1 or Share 2 in isolation reveals 100% entropy (pure subpixel noise). No information about the secret can be computed from a single slide.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Share 1 (Slide A)</span>
              <canvas
                ref={share1CanvasRef}
                width={256}
                height={256}
                className="w-full max-w-[180px] rounded border border-zinc-300 dark:border-zinc-700 shadow-sm"
              />
              <span className="text-[11px] text-zinc-500">Random Subpixel Noise</span>
            </div>

            <div className="flex flex-col items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Share 2 (Slide B)</span>
              <canvas
                ref={share2CanvasRef}
                width={256}
                height={256}
                className="w-full max-w-[180px] rounded border border-zinc-300 dark:border-zinc-700 shadow-sm"
              />
              <span className="text-[11px] text-zinc-500">Random Subpixel Noise</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Drag & Overlay Reconstruction */}
      <div className="rounded-2xl border border-teal-500/30 bg-teal-50/30 p-6 dark:border-teal-500/20 dark:bg-teal-950/20 shadow-sm">
        <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              3. Interactive Optical Decryption via Subpixel Superposition
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Drag the slide overlay control below to stack Share 2 onto Share 1. Notice how alignment optically reconstructs the secret image!
            </p>
          </div>
          <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300">
            Slide Alignment: {100 - overlayOffset}%
          </span>
        </div>

        <div className="mb-4 flex flex-col gap-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Slide Alignment Offset (Drag to Overlay)
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={overlayOffset}
            onChange={(e) => setOverlayOffset(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-300 accent-teal-600 dark:bg-zinc-700 dark:accent-teal-400"
          />
        </div>

        {/* Visual Overlay Stacking Area */}
        <div className="relative mx-auto flex h-[320px] w-full max-w-[500px] items-center justify-center overflow-hidden rounded-xl border border-zinc-300 bg-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950/60 p-4">
          {/* Base Canvas (Share 1) */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <canvas
              ref={share1CanvasRef}
              width={256}
              height={256}
              className="rounded border border-zinc-400 dark:border-zinc-600 shadow-md opacity-90"
            />
            <span className="absolute -bottom-6 left-0 text-[10px] font-bold uppercase text-zinc-500">Base: Share 1</span>
          </div>

          {/* Draggable Overlay Canvas (Share 2) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 transition-all ease-out"
            style={{
              left: `calc(50% - 128px + ${(overlayOffset / 100) * 160}px)`,
              opacity: 0.85,
              mixBlendMode: 'multiply',
            }}
          >
            <canvas
              ref={share2CanvasRef}
              width={256}
              height={256}
              className="rounded border-2 border-teal-500 shadow-xl"
            />
            <span className="absolute -top-6 right-0 text-[10px] font-bold uppercase text-teal-600 dark:text-teal-400">
              Draggable: Share 2
            </span>
          </div>
        </div>

        {/* Subpixel Superposition Mathematical Proof Card */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-300 border border-zinc-400" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">White Pixel Subpixel Overlay</h4>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Share 1 & Share 2 receive <strong>identical</strong> 2×2 subpixel patterns. Superposition covers 2 out of 4 subpixel quadrants (50% light transmission).
            </p>
          </Card>

          <Card className="p-4">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-zinc-900 border border-zinc-950" />
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Black Pixel Subpixel Overlay</h4>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Share 1 & Share 2 receive <strong>complementary</strong> 2×2 subpixel patterns. Superposition covers all 4 out of 4 subpixel quadrants (0% light transmission).
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
