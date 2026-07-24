export interface Argon2idVisualizerParams {
  password: string;
  salt: string;
  memoryBlocks: number;
  iterations: number;
  lanes: number;
  outputBytes: number;
}

export type Argon2idPhase =
  "initialization" | "argon2i" | "argon2d" | "finalization";

export interface Argon2idMemoryBlock {
  index: number;
  lane: number;
  iteration: number;
  phase: Argon2idPhase;
  referenceBlock: number | null;
  value: string;
  note: string;
}

export interface Argon2idPhaseSummary {
  id: Argon2idPhase;
  title: string;
  description: string;
  blockCount: number;
}

export interface Argon2idVisualizerResult {
  digest: string;
  params: Argon2idVisualizerParams;
  blocks: Argon2idMemoryBlock[];
  phases: Argon2idPhaseSummary[];
  securityNotes: string[];
  estimatedWorkFactor: number;
}

export const DEFAULT_ARGON2ID_PARAMS: Argon2idVisualizerParams = {
  password: "correct horse battery staple",
  salt: "cryptoviz-demo-salt",
  memoryBlocks: 24,
  iterations: 3,
  lanes: 2,
  outputBytes: 16,
};

export const ARGON2ID_PHASES: Omit<Argon2idPhaseSummary, "blockCount">[] = [
  {
    id: "initialization",
    title: "Initialization",
    description: "Password, salt, and parameters seed the first memory blocks.",
  },
  {
    id: "argon2i",
    title: "Argon2i-style pass",
    description: "Data-independent references reduce side-channel leakage.",
  },
  {
    id: "argon2d",
    title: "Argon2d-style pass",
    description:
      "Data-influenced references increase memory-hard cracking cost.",
  },
  {
    id: "finalization",
    title: "Finalization",
    description: "Final memory state is compressed into the derived digest.",
  },
];

function requireInt(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer.`);
  if (value < min || value > max)
    throw new Error(`${label} must be between ${min} and ${max}.`);
  return value;
}

export function validateArgon2idParams(
  params: Argon2idVisualizerParams,
): Argon2idVisualizerParams {
  const password = params.password.trim();
  const salt = params.salt.trim();

  if (!password) throw new Error("Password is required for the Argon2id demo.");
  if (!salt) throw new Error("Salt is required for the Argon2id demo.");

  return {
    password,
    salt,
    memoryBlocks: requireInt(params.memoryBlocks, 8, 64, "Memory blocks"),
    iterations: requireInt(params.iterations, 1, 6, "Iterations"),
    lanes: requireInt(params.lanes, 1, 4, "Lanes"),
    outputBytes: requireInt(params.outputBytes, 8, 32, "Output bytes"),
  };
}

function rotl32(value: number, bits: number) {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}

function mix32(value: number) {
  let hash = value >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d) >>> 0;
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b) >>> 0;
  hash ^= hash >>> 16;
  return hash >>> 0;
}

function hashStringTo32(input: string) {
  let hash = 0x811c9dc5;
  for (const char of input) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return mix32(hash);
}

function toHex32(value: number) {
  return (value >>> 0).toString(16).padStart(8, "0");
}

function expandDigest(seed: number, outputBytes: number) {
  const chunks: string[] = [];
  let state = seed >>> 0;
  while (chunks.join("").length < outputBytes * 2) {
    state = mix32(state + 0x9e3779b9 + chunks.length);
    chunks.push(toHex32(state));
  }
  return chunks.join("").slice(0, outputBytes * 2);
}

function phaseFor(
  iteration: number,
  blockIndex: number,
  totalBlocks: number,
): Argon2idPhase {
  if (iteration === 0) return "initialization";
  if (iteration === 1 || blockIndex < Math.ceil(totalBlocks / 2))
    return "argon2i";
  return "argon2d";
}

export function estimateArgon2idWorkFactor(
  params: Pick<
    Argon2idVisualizerParams,
    "memoryBlocks" | "iterations" | "lanes"
  >,
) {
  return params.memoryBlocks * params.iterations * params.lanes;
}

export function describeArgon2idRisk(params: Argon2idVisualizerParams) {
  const safe = validateArgon2idParams(params);
  const work = estimateArgon2idWorkFactor(safe);
  if (work >= 144) return "strong demo setting";
  if (work >= 64) return "moderate demo setting";
  return "weak demo setting";
}

export function runArgon2idVisualization(
  rawParams: Argon2idVisualizerParams,
): Argon2idVisualizerResult {
  const params = validateArgon2idParams(rawParams);
  const seed = hashStringTo32(
    `${params.password}|${params.salt}|${params.memoryBlocks}|${params.iterations}|${params.lanes}|${params.outputBytes}`,
  );
  const blocks: Argon2idMemoryBlock[] = [];
  let rolling = seed;

  for (let iteration = 0; iteration < params.iterations; iteration += 1) {
    for (let index = 0; index < params.memoryBlocks; index += 1) {
      const lane = index % params.lanes;
      const phase = phaseFor(iteration, index, params.memoryBlocks);
      const referenceBlock =
        index === 0 && iteration === 0
          ? null
          : phase === "argon2i"
            ? (index + iteration * 7 + lane * 3) % params.memoryBlocks
            : mix32(rolling + index + lane) % params.memoryBlocks;
      const ref =
        referenceBlock === null
          ? seed
          : hashStringTo32(`${referenceBlock}:${rolling}`);

      rolling = mix32(
        rolling ^
          rotl32(seed + index + iteration, (lane + 5) % 31) ^
          ref ^
          params.memoryBlocks ^
          params.iterations,
      );

      blocks.push({
        index,
        lane,
        iteration,
        phase,
        referenceBlock,
        value: toHex32(rolling),
        note:
          phase === "initialization"
            ? "Initial memory is filled from password, salt, and parameter metadata."
            : phase === "argon2i"
              ? "Argon2i-style access uses predictable references to explain side-channel resistance."
              : "Argon2d-style access uses content-influenced references to explain memory hardness.",
      });
    }
  }

  const finalSeed = blocks.reduce(
    (state, block) =>
      mix32(state ^ Number.parseInt(block.value, 16) ^ block.index),
    rolling,
  );

  blocks.push({
    index: params.memoryBlocks,
    lane: 0,
    iteration: params.iterations,
    phase: "finalization",
    referenceBlock: params.memoryBlocks - 1,
    value: toHex32(finalSeed),
    note: "Final memory state is compressed into a derived demo digest.",
  });

  return {
    digest: expandDigest(finalSeed, params.outputBytes),
    params,
    blocks,
    phases: ARGON2ID_PHASES.map((phase) => ({
      ...phase,
      blockCount: blocks.filter((block) => block.phase === phase.id).length,
    })),
    securityNotes: [
      "Argon2id combines Argon2i-style and Argon2d-style memory access patterns.",
      "Use a trusted Argon2id implementation such as libsodium, argon2, or a platform KDF library in production.",
      "Never store raw passwords. Store salts and password hashes generated with strong parameters.",
      "Higher memory and iteration settings increase attacker cost but also increase legitimate login cost.",
    ],
    estimatedWorkFactor: estimateArgon2idWorkFactor(params),
  };
}
