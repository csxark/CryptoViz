import { sha256 } from '@noble/hashes/sha2.js'

const CERTIFICATE_SALT = 'cryptoviz-cert-salt-2026-secret'

/**
 * Generates a SHA-256 hash for a certificate based on name, pathId, date, and a salt.
 */
export function generateCertificateHash(name: string, pathId: string, date: string): string {
  const normalizedName = name.trim().toLowerCase()
  const normalizedPath = pathId.trim().toLowerCase()
  const normalizedDate = date.trim()
  const rawString = `${normalizedName}:${normalizedPath}:${normalizedDate}:${CERTIFICATE_SALT}`
  
  const bytes = new TextEncoder().encode(rawString)
  const hashed = sha256(bytes)
  
  return Array.from(hashed)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Verifies if a given hash is a valid certificate signature for the provided name, pathId, and date.
 */
export function verifyCertificateHash(name: string, pathId: string, date: string, hash: string): boolean {
  if (!name || !pathId || !date || !hash) return false
  const expectedHash = generateCertificateHash(name, pathId, date)
  return expectedHash.toLowerCase() === hash.trim().toLowerCase()
}

/**
 * Generates a user-friendly certificate serial/ID.
 * E.g. CV-CF-A8B9C1D2
 */
export function getCertificateId(pathId: string, hash: string): string {
  const prefix = 'CV'
  const pathPart = pathId
    .split('-')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  const hashPart = hash.slice(0, 8).toUpperCase()
  return `${prefix}-${pathPart}-${hashPart}`
}
