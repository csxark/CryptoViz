/**
 * Pure calculation utilities for the Brute Force Attack Time Estimator.
 */

export interface PresetSpeed {
  id: string;
  name: string;
  speed: number; // in hashes per second
  description: string;
}

export const SPEED_PRESETS: PresetSpeed[] = [
  {
    id: "online",
    name: "Online Login Limit",
    speed: 10,
    description: "Rate-limited login page (10 attempts/sec)",
  },
  {
    id: "wifi",
    name: "WiFi (WPA2) Attack",
    speed: 100_000,
    description: "Standard offline GPU/CPU attack on WPA2 handshake (100 kH/s)",
  },
  {
    id: "gpu",
    name: "Standard GPU (bcrypt)",
    speed: 10_000_000,
    description: "Medium-speed GPU offline cracking rig (10 MH/s)",
  },
  {
    id: "gpu-rig",
    name: "Multi-GPU Hashcat Rig (MD5/SHA1)",
    speed: 1_000_000_000,
    description: "Multi-GPU offline cracking rig (1 GH/s)",
  },
  {
    id: "supercomputer",
    name: "ASIC Cluster / Supercomputer",
    speed: 100_000_000_000,
    description: "Specialized enterprise-grade cracking cluster (100 GH/s)",
  },
];

export interface CharsetOption {
  id: string;
  name: string;
  size: number;
  characters: string;
  example: string;
}

export const CHARACTER_SETS: CharsetOption[] = [
  {
    id: "lowercase",
    name: "Lowercase Letters",
    size: 26,
    characters: "abcdefghijklmnopqrstuvwxyz",
    example: "a-z",
  },
  {
    id: "uppercase",
    name: "Uppercase Letters",
    size: 26,
    characters: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    example: "A-Z",
  },
  {
    id: "numbers",
    name: "Numbers",
    size: 10,
    characters: "0123456789",
    example: "0-9",
  },
  {
    id: "symbols",
    name: "Symbols",
    size: 33,
    characters: " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
    example: "Special chars (e.g. !, @, #)",
  },
];

export function calculateKeyspace(length: number, charsetSize: number): bigint {
  if (charsetSize <= 0 || length <= 0) return 0n;
  return BigInt(charsetSize) ** BigInt(length);
}

export function calculateEntropy(length: number, charsetSize: number): number {
  if (charsetSize <= 0 || length <= 0) return 0;
  return length * Math.log2(charsetSize);
}

export function calculateEstimatedTime(
  keyspace: bigint,
  speed: number,
): { averageSec: number; worstSec: number } {
  if (speed <= 0 || keyspace <= 0n) {
    return { averageSec: Infinity, worstSec: Infinity };
  }
  const keyspaceNum = Number(keyspace);
  return {
    averageSec: keyspaceNum / (2 * speed),
    worstSec: keyspaceNum / speed,
  };
}

export { formatDuration } from "@/lib/formatters";

export interface StrengthInfo {
  score: number; // 0 to 4
  label: string;
  colorClass: string;
  bgClass: string;
  progressColor: string;
}

export function getStrengthIndicator(entropy: number): StrengthInfo {
  if (entropy < 28) {
    return {
      score: 0,
      label: "Very Weak",
      colorClass: "text-red-400 bg-red-500/10 border-red-500/20",
      bgClass: "bg-red-950/20",
      progressColor: "bg-red-500",
    };
  }
  if (entropy < 36) {
    return {
      score: 1,
      label: "Weak",
      colorClass: "text-orange-400 bg-orange-500/10 border-orange-500/20",
      bgClass: "bg-orange-950/20",
      progressColor: "bg-orange-500",
    };
  }
  if (entropy < 60) {
    return {
      score: 2,
      label: "Reasonable",
      colorClass: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
      bgClass: "bg-yellow-950/20",
      progressColor: "bg-yellow-500",
    };
  }
  if (entropy < 128) {
    return {
      score: 3,
      label: "Strong",
      colorClass: "text-green-400 bg-green-500/10 border-green-500/20",
      bgClass: "bg-green-950/20",
      progressColor: "bg-green-500",
    };
  }
  return {
    score: 4,
    label: "Very Strong",
    colorClass: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    bgClass: "bg-teal-950/20",
    progressColor: "bg-teal-500",
  };
}
