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

export function formatDuration(seconds: number): string {
  if (seconds === Infinity) return "Practically infinite";
  if (isNaN(seconds)) return "Unknown";
  if (seconds <= 0) return "Instantaneous";

  if (seconds < 0.001) {
    return "Less than 1 millisecond";
  }
  if (seconds < 1) {
    const ms = Math.round(seconds * 1000);
    return `${ms} millisecond${ms > 1 ? "s" : ""}`;
  }

  const MINUTE = 60;
  const HOUR = 3600;
  const DAY = 86400;
  const YEAR = 31557600; // 365.25 days
  const AGE_OF_UNIVERSE_YEARS = 13.8e9;
  const AGE_OF_UNIVERSE = AGE_OF_UNIVERSE_YEARS * YEAR;

  if (seconds < MINUTE) {
    const val = seconds.toFixed(1).replace(/\.0$/, "");
    return `${val} second${val === "1" ? "" : "s"}`;
  }
  if (seconds < HOUR) {
    const val = (seconds / MINUTE).toFixed(1).replace(/\.0$/, "");
    return `${val} minute${val === "1" ? "" : "s"}`;
  }
  if (seconds < DAY) {
    const val = (seconds / HOUR).toFixed(1).replace(/\.0$/, "");
    return `${val} hour${val === "1" ? "" : "s"}`;
  }
  if (seconds < YEAR) {
    const val = (seconds / DAY).toFixed(1).replace(/\.0$/, "");
    return `${val} day${val === "1" ? "" : "s"}`;
  }

  const years = seconds / YEAR;
  if (years < AGE_OF_UNIVERSE_YEARS) {
    if (years < 100) {
      const val = years.toFixed(1).replace(/\.0$/, "");
      return `${val} year${val === "1" ? "" : "s"}`;
    }
    if (years < 1000) {
      return `${Math.round(years)} years`;
    }
    if (years < 1e6) {
      return `${(years / 1000).toFixed(1).replace(/\.0$/, "")} thousand years`;
    }
    if (years < 1e9) {
      return `${(years / 1e6).toFixed(1).replace(/\.0$/, "")} million years`;
    }
    return `${(years / 1e9).toFixed(1).replace(/\.0$/, "")} billion years`;
  }

  const timesUniverse = seconds / AGE_OF_UNIVERSE;
  if (timesUniverse < 1e3) {
    return `${timesUniverse.toFixed(1).replace(/\.0$/, "")} × Age of the Universe`;
  }
  if (timesUniverse < 1e6) {
    return `${(timesUniverse / 1e3).toFixed(1).replace(/\.0$/, "")} thousand × Age of the Universe`;
  }
  if (timesUniverse < 1e9) {
    return `${(timesUniverse / 1e6).toFixed(1).replace(/\.0$/, "")} million × Age of the Universe`;
  }
  if (timesUniverse < 1e12) {
    return `${(timesUniverse / 1e9).toFixed(1).replace(/\.0$/, "")} billion × Age of the Universe`;
  }
  if (timesUniverse < 1e15) {
    return `${(timesUniverse / 1e12).toFixed(1).replace(/\.0$/, "")} trillion × Age of the Universe`;
  }

  return `${years.toExponential(2)} years`;
}

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
