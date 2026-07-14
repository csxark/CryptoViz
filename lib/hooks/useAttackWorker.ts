'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { WorkerPool } from '../workers/pool'
import type { AttackStep, OracleMode } from '../attacks/paddingOracle'

export function useAttackWorker() {
  const poolRef = useRef<WorkerPool | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      poolRef.current = new WorkerPool(() => {
        return new Worker(new URL('../workers/attack.worker.ts', import.meta.url))
      })
    }

    return () => {
      if (poolRef.current) {
        poolRef.current.terminate()
        poolRef.current = null
      }
    }
  }, [])

  const recoverPlaintextConcurrently = useCallback(async (
    key: string,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    mode: OracleMode,
    onStep?: (step: AttackStep) => void
  ): Promise<{ plaintext: Uint8Array, queryCount: number }> => {
    if (!poolRef.current) throw new Error('Worker pool not initialized')
    
    setLoading(true)
    setError(null)
    
    const BLOCK_SIZE = 16
    const numBlocks = ciphertext.length / BLOCK_SIZE
    
    if (!Number.isInteger(numBlocks) || numBlocks < 1) {
      setLoading(false)
      throw new Error('Ciphertext length must be a positive multiple of the block size.')
    }

    // Determine if SharedArrayBuffer is available
    const useSharedMemory = typeof SharedArrayBuffer !== 'undefined'

    let sharedCiphertextBuffer: ArrayBuffer | SharedArrayBuffer | null = null
    if (useSharedMemory) {
      sharedCiphertextBuffer = new SharedArrayBuffer(ciphertext.length)
      new Uint8Array(sharedCiphertextBuffer).set(ciphertext)
    }

    const blocks = [iv]
    for (let i = 0; i < ciphertext.length; i += BLOCK_SIZE) {
      blocks.push(ciphertext.subarray(i, i + BLOCK_SIZE))
    }

    let totalQueries = 0
    const plaintextBlocks: Uint8Array[] = new Array(numBlocks)
    
    const promises: Promise<void>[] = []

    for (let i = 1; i < blocks.length; i++) {
      const prevBlock = blocks[i - 1]
      const targetBlock = blocks[i]
      const blockIndex = i - 1

      // We transfer a copy if SharedArrayBuffer is not available, avoiding serialization
      const prevBlockBuffer = useSharedMemory ? new Uint8Array(prevBlock).buffer : prevBlock.buffer.slice(prevBlock.byteOffset, prevBlock.byteOffset + prevBlock.byteLength)
      const targetBlockBuffer = useSharedMemory && sharedCiphertextBuffer 
        ? sharedCiphertextBuffer
        : targetBlock.buffer.slice(targetBlock.byteOffset, targetBlock.byteOffset + targetBlock.byteLength)

      const transferList = useSharedMemory ? [] : [prevBlockBuffer, targetBlockBuffer]

      const promise = poolRef.current.execute(
        {
          type: 'recoverBlock',
          payload: {
            key,
            mode,
            prevBlockBuffer,
            targetBlockBuffer,
            blockOffset: useSharedMemory ? blockIndex * BLOCK_SIZE : 0,
            blockIndex,
          }
        },
        transferList,
        (step) => {
          if (onStep) onStep(step)
        }
      ).then(result => {
        const { plaintext, queryCount } = result
        plaintextBlocks[blockIndex] = new Uint8Array(plaintext)
        totalQueries += queryCount
      })
      
      promises.push(promise)
    }
    
    try {
      await Promise.all(promises)
      
      const totalLen = plaintextBlocks.reduce((sum, block) => sum + block.length, 0)
      const fullPlaintext = new Uint8Array(totalLen)
      let offset = 0
      for (const block of plaintextBlocks) {
        fullPlaintext.set(block, offset)
        offset += block.length
      }

      setLoading(false)
      return { plaintext: fullPlaintext, queryCount: totalQueries }
    } catch (err: any) {
      setLoading(false)
      const msg = err.message || 'Worker execution failed'
      setError(msg)
      throw new Error(msg)
    }
  }, [])

  const cancel = useCallback(() => {
    if (poolRef.current) {
      poolRef.current.terminate()
      poolRef.current = new WorkerPool(() => {
        return new Worker(new URL('../workers/attack.worker.ts', import.meta.url))
      })
      setLoading(false)
    }
  }, [])

  return { recoverPlaintextConcurrently, cancel, loading, error }
}
