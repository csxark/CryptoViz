import { CIPHER_REGISTRY } from "../cipher/registry";
import type { CipherDirection } from "../cipher/types";

export const WORKSPACE_PRESETS_STORAGE_KEY = "cryptoviz-workspace-presets";
export const WORKSPACE_PRESETS_VERSION = 1;
export const MAX_WORKSPACE_PRESETS = 30;
export const ANIMATION_SPEEDS = [0.5, 1, 2, 4] as const;

export type AnimationSpeed = (typeof ANIMATION_SPEEDS)[number];

export interface WorkspacePreset {
  id: string;
  version: typeof WORKSPACE_PRESETS_VERSION;
  name: string;
  cipherId: string;
  direction: CipherDirection;
  input: string;
  key?: string;
  options: Record<string, string | number | boolean>;
  animationSpeed: AnimationSpeed;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacePresetDraft {
  name: string;
  cipherId: string;
  direction: CipherDirection;
  input: string;
  key?: string;
  options: Record<string, unknown>;
  animationSpeed: number;
}

const SAFE_OPTION_KEYS = new Set([
  "hexInput",
  "rounds",
  "demoMode",
  "bobSecret",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 60);
}

function sanitizeOptions(
  value: unknown,
): Record<string, string | number | boolean> {
  if (!isRecord(value)) return {};

  const options: Record<string, string | number | boolean> = {};
  for (const [key, option] of Object.entries(value)) {
    if (
      SAFE_OPTION_KEYS.has(key) &&
      (typeof option === "string" ||
        typeof option === "number" ||
        typeof option === "boolean")
    ) {
      options[key] = option;
    }
  }
  return options;
}

function isAnimationSpeed(value: unknown): value is AnimationSpeed {
  return (
    typeof value === "number" &&
    ANIMATION_SPEEDS.includes(value as AnimationSpeed)
  );
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function normalizeWorkspacePreset(
  value: unknown,
): WorkspacePreset | null {
  if (!isRecord(value)) return null;

  const name = typeof value.name === "string" ? sanitizeName(value.name) : "";
  const cipherId = typeof value.cipherId === "string" ? value.cipherId : "";

  if (
    value.version !== WORKSPACE_PRESETS_VERSION ||
    !name ||
    typeof value.id !== "string" ||
    !CIPHER_REGISTRY.some((cipher) => cipher.id === cipherId) ||
    (value.direction !== "encrypt" && value.direction !== "decrypt") ||
    typeof value.input !== "string" ||
    (value.key !== undefined && typeof value.key !== "string") ||
    !isAnimationSpeed(value.animationSpeed) ||
    !isValidDate(value.createdAt) ||
    !isValidDate(value.updatedAt)
  ) {
    return null;
  }

  return {
    id: value.id,
    version: WORKSPACE_PRESETS_VERSION,
    name,
    cipherId,
    direction: value.direction,
    input: value.input,
    key: value.key,
    options: sanitizeOptions(value.options),
    animationSpeed: value.animationSpeed,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

export function normalizeWorkspacePresets(value: unknown): WorkspacePreset[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const normalized: WorkspacePreset[] = [];

  for (const item of value) {
    const preset = normalizeWorkspacePreset(item);
    if (!preset || seen.has(preset.id)) continue;
    seen.add(preset.id);
    normalized.push(preset);
  }

  return normalized
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, MAX_WORKSPACE_PRESETS);
}

export function loadWorkspacePresets(): WorkspacePreset[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(WORKSPACE_PRESETS_STORAGE_KEY);
    return raw ? normalizeWorkspacePresets(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveWorkspacePresets(
  presets: WorkspacePreset[],
): WorkspacePreset[] {
  const normalized = normalizeWorkspacePresets(presets);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      WORKSPACE_PRESETS_STORAGE_KEY,
      JSON.stringify(normalized),
    );
  }
  return normalized;
}

export function createWorkspacePreset(
  draft: WorkspacePresetDraft,
): WorkspacePreset {
  const name = sanitizeName(draft.name);
  if (!name) throw new Error("Preset name is required.");
  if (!CIPHER_REGISTRY.some((cipher) => cipher.id === draft.cipherId)) {
    throw new Error("Unsupported cipher.");
  }

  const now = new Date().toISOString();
  return {
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    version: WORKSPACE_PRESETS_VERSION,
    name,
    cipherId: draft.cipherId,
    direction: draft.direction,
    input: draft.input,
    key: draft.key,
    options: sanitizeOptions(draft.options),
    animationSpeed: isAnimationSpeed(draft.animationSpeed)
      ? draft.animationSpeed
      : 1,
    createdAt: now,
    updatedAt: now,
  };
}

export function renameWorkspacePreset(
  preset: WorkspacePreset,
  name: string,
): WorkspacePreset {
  const nextName = sanitizeName(name);
  if (!nextName) throw new Error("Preset name is required.");

  return {
    ...preset,
    name: nextName,
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateWorkspacePreset(
  preset: WorkspacePreset,
): WorkspacePreset {
  const now = new Date().toISOString();
  return {
    ...preset,
    id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${preset.name} copy`.slice(0, 60),
    createdAt: now,
    updatedAt: now,
  };
}
