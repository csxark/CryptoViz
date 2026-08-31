
import { generateRsaWizard, type RsaWizardInput } from "../asymmetric/rsaKeyGenerationWizard"
import { encrypt, type AesMode } from "../cipher/symmetric/aes"
import type { WorkerPriority } from "./pool"

export type CryptoWorkerRequest =
  | { id: string; operation: "rsaWizard"; payload: RsaWizardInput; jobId?: string; priority?: WorkerPriority }
  | { id: string; operation: "batchModesLab"; payload: { text: string; flipped: string; key: string; iv: string; modes: AesMode[] }; jobId?: string; priority?: WorkerPriority }
  | { type: "CANCEL"; jobId: string }

export type CryptoWorkerResponse =
  | { id: string; success: true; result: unknown }
  | { id: string; success: false; error: string }

const cancelledJobs = new Set<string>()
const lastProgressAt = new Map<string, number>()

function progress(jobId: string, percent: number, currentMilestone: string, force = false) {
  const now = performance.now()
  const last = lastProgressAt.get(jobId) ?? -Infinity
  if (!force && now - last < 50) return
  lastProgressAt.set(jobId, now)
  self.postMessage({
    type: "PROGRESS",
    jobId,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    currentMilestone,
  })
}

function assertNotCancelled(jobId: string) {
  if (cancelledJobs.has(jobId)) throw new DOMException("The user aborted the request.", "AbortError")
}

self.onmessage = async (event: MessageEvent<CryptoWorkerRequest>) => {
  if ("type" in event.data && event.data.type === "CANCEL") {
    cancelledJobs.add(event.data.jobId)
    return
  }

  const request = event.data as Exclude<CryptoWorkerRequest, { type: "CANCEL" }>
  const { id, operation, payload, jobId = id } = request
  try {
    progress(jobId, 0, "Queued", true)
    let result: unknown

    if (operation === "rsaWizard") {
      progress(jobId, 10, "Preparing RSA parameters", true)
      assertNotCancelled(jobId)
      result = generateRsaWizard(payload)
      progress(jobId, 100, "RSA generation complete", true)
    } else if (operation === "batchModesLab") {
      const { text, flipped, key, iv, modes } = payload
      const ciphertextHex = (mode: AesMode, data: string) => {
        const options = mode === "ECB" ? { mode } : { mode, iv }
        const out = encrypt(data, key, options).output
        return mode === "ECB" ? out : out.slice(32)
      }
      const hexToBytes = (hex: string) => {
        const pairs: string[] = []
        for (let i = 0; i < hex.length; i += 2) pairs.push(hex.slice(i, i + 2))
        return pairs
      }
      result = []
      for (let index = 0; index < modes.length; index++) {
        assertNotCancelled(jobId)
        const mode = modes[index]
        const original = hexToBytes(ciphertextHex(mode, text))
        const changed = hexToBytes(ciphertextHex(mode, flipped))
        const diff = original.map((b: string, i: number) => b !== changed[i])
        const changedCount = diff.filter(Boolean).length
        ;(result as unknown[]).push({ modeId: mode, changed, diff, changedCount, total: changed.length })
        progress(jobId, ((index + 1) / modes.length) * 100, `Processed ${mode}`)
        // Yield to the event loop between modes so CANCEL and higher-priority UI work can be observed.
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
    } else {
      throw new Error(`Unknown operation: ${operation}`)
    }

    self.postMessage({ id, success: true, result })
  } catch (error) {
    self.postMessage({ id, success: false, error: error instanceof Error ? error.message : "Unknown error" })
  } finally {
    cancelledJobs.delete(jobId)
    lastProgressAt.delete(jobId)
  }
}
export {}
