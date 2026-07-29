export interface HashCollisionInput {
  valuesText: string
  hashBits: number
}

export interface CollisionValue {
  index: number
  value: string
  fullHash: string
  truncatedHash: string
  bucket: number
}

export interface CollisionGroup {
  hash: string
  bucket: number
  values: CollisionValue[]
  collisionCount: number
}

export interface HashCollisionResult {
  values: CollisionValue[]
  groups: CollisionGroup[]
  collisionGroups: CollisionGroup[]
  totalCollisions: number
  hashBits: number
  bucketCount: number
  collisionRate: number
  explanation: string
}

export const DEFAULT_HASH_COLLISION_INPUT: HashCollisionInput = {
  valuesText: "apple\nbanana\ncarrot\ndelta\necho\nfoxtrot\ngrape\nhotel",
  hashBits: 8,
}

export const HASH_COLLISION_SAMPLE_SETS = {
  fruits: "apple\nbanana\ncarrot\ndelta\necho\nfoxtrot\ngrape\nhotel",
  names: "alice\nbob\ncarol\ndave\neve\nmallory\ntrent\npeggy",
  transactions:
    "Alice pays Bob 5\nBob pays Carol 2\nCarol pays Dave 1\nDave pays Eve 3\nEve pays Frank 4\nFrank pays Grace 8",
}

function toHex32(value: number) {
  return (value >>> 0).toString(16).padStart(8, "0")
}

export function demoHash32(input: string): string {
  let hash = 0x811c9dc5

  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  hash ^= hash >>> 16
  hash = Math.imul(hash, 0x7feb352d) >>> 0
  hash ^= hash >>> 15
  hash = Math.imul(hash, 0x846ca68b) >>> 0
  hash ^= hash >>> 16

  return toHex32(hash)
}

export function parseCollisionValues(valuesText: string): string[] {
  return valuesText
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function validateHashCollisionInput(input: HashCollisionInput): HashCollisionInput {
  const values = parseCollisionValues(input.valuesText)

  if (values.length < 2) {
    throw new Error("Add at least two values to search for collisions.")
  }

  if (values.length > 64) {
    throw new Error("This educational playground supports up to 64 values.")
  }

  if (!Number.isInteger(input.hashBits) || input.hashBits < 4 || input.hashBits > 16) {
    throw new Error("Hash bits must be an integer between 4 and 16.")
  }

  return {
    valuesText: values.join("\n"),
    hashBits: input.hashBits,
  }
}

export function truncateHash(fullHash: string, bits: number): string {
  const value = Number.parseInt(fullHash, 16) >>> 0
  const mask = bits === 32 ? 0xffffffff : (1 << bits) - 1
  const truncated = value & mask
  const width = Math.ceil(bits / 4)

  return truncated.toString(16).toUpperCase().padStart(width, "0")
}

export function runHashCollisionPlayground(rawInput: HashCollisionInput): HashCollisionResult {
  const input = validateHashCollisionInput(rawInput)
  const rawValues = parseCollisionValues(input.valuesText)
  const bucketCount = 2 ** input.hashBits

  const values: CollisionValue[] = rawValues.map((value, index) => {
    const fullHash = demoHash32(value)
    const truncatedHash = truncateHash(fullHash, input.hashBits)

    return {
      index,
      value,
      fullHash,
      truncatedHash,
      bucket: Number.parseInt(truncatedHash, 16),
    }
  })

  const grouped = new Map<string, CollisionValue[]>()
  for (const value of values) {
    const current = grouped.get(value.truncatedHash) ?? []
    current.push(value)
    grouped.set(value.truncatedHash, current)
  }

  const groups: CollisionGroup[] = Array.from(grouped.entries())
    .map(([hash, groupValues]) => ({
      hash,
      bucket: Number.parseInt(hash, 16),
      values: groupValues,
      collisionCount: Math.max(0, groupValues.length - 1),
    }))
    .sort((a, b) => b.values.length - a.values.length || a.bucket - b.bucket)

  const collisionGroups = groups.filter((group) => group.values.length > 1)
  const totalCollisions = collisionGroups.reduce(
    (sum, group) => sum + group.collisionCount,
    0,
  )

  return {
    values,
    groups,
    collisionGroups,
    totalCollisions,
    hashBits: input.hashBits,
    bucketCount,
    collisionRate: values.length === 0 ? 0 : totalCollisions / values.length,
    explanation:
      "A collision happens when two different inputs land in the same hash bucket. This playground intentionally truncates a demo hash so collisions are easy to see.",
  }
}

export function estimateBirthdayCollisionChance(valueCount: number, hashBits: number): number {
  const buckets = 2 ** hashBits

  if (valueCount <= 1) return 0

  const noCollisionApprox = Math.exp(-(valueCount * (valueCount - 1)) / (2 * buckets))
  return 1 - noCollisionApprox
}

export function buildHashCollisionManualChecklist(): string[] {
  return [
    "Open the Hash Collision Playground page.",
    "Confirm the default values render hash buckets and collision summary.",
    "Change hash bits to a smaller value and confirm collisions become more likely.",
    "Change hash bits to a larger value and confirm collisions become less likely.",
    "Add or edit values and confirm hashes and buckets update.",
    "Use a sample set button and confirm the input list changes.",
    "Enter only one value and confirm a friendly validation error appears.",
    "Resize to mobile width and confirm cards and tables remain usable.",
  ]
}
