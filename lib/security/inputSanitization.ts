import DOMPurify from "dompurify";
// @ts-ignore
import { JSDOM } from "jsdom";

const domWindow =
  typeof window !== "undefined"
    ? (window as unknown as Window & typeof globalThis)
    : (new JSDOM("").window as unknown as Window & typeof globalThis);
const purifier = DOMPurify(domWindow);

export type SanitizedInputKind =
  | "plain-text"
  | "hex"
  | "search"
  | "url"
  | "markdown"
  | "identifier";

export interface SanitizationOptions {
  kind?: SanitizedInputKind;
  maxLength?: number;
  allowNewlines?: boolean;
  trim?: boolean;
  collapseWhitespace?: boolean;
  preserveCase?: boolean;
  escapeHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

export interface SanitizationResult {
  value: string;
  changed: boolean;
  removedCharacters: number;
  warnings: string[];
}

const DEFAULT_MAX_LENGTH = 4096;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

function normalizeInput(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).normalize("NFKC");
}

export function escapeHtml(value: unknown): string {
  return normalizeInput(value).replace(/[&<>"'`]/g, (char) => HTML_ESCAPE_MAP[char]);
}

export function stripControlCharacters(value: unknown, allowNewlines = false): string {
  const normalized = normalizeInput(value);
  const stripped = normalized.replace(CONTROL_CHARACTERS, "");

  if (allowNewlines) {
    return stripped.replace(/\r\n?/g, "\n");
  }

  return stripped.replace(/[\r\n\t]/g, " ");
}

export function sanitizeCryptoInput(value: unknown, options: SanitizationOptions = {}): SanitizationResult {
  const maxLength = Math.max(1, options.maxLength ?? DEFAULT_MAX_LENGTH);
  const original = normalizeInput(value);
  let sanitized = stripControlCharacters(original, options.allowNewlines ?? false);

  if (options.trim !== false) sanitized = sanitized.trim();
  if (options.collapseWhitespace !== false) {
    sanitized = options.allowNewlines
      ? sanitized.replace(/[^\S\n]+/g, " ").replace(/\n{3,}/g, "\n\n")
      : sanitized.replace(/\s+/g, " ");
  }

  if (options.escapeHtml === true) {
    sanitized = escapeHtml(sanitized);
    // Neutralize inline event handler attributes (e.g., onerror=, onload=) in unquoted attribute contexts
    sanitized = sanitized.replace(/on\w+\s*=/gi, "data-sanitized-event=");
  }

  const warnings: string[] = [];
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    warnings.push(`Input was truncated to ${maxLength} characters.`);
  }

  return {
    value: sanitized,
    changed: sanitized !== original,
    removedCharacters: Math.max(0, original.length - sanitized.length),
    warnings,
  };
}

export function sanitizePlainText(value: unknown, options: SanitizationOptions = {}): SanitizationResult {
  const result = sanitizeCryptoInput(value, {
    escapeHtml: false,
    ...options,
  });

  let val = result.value;

  if (options.escapeHtml === false) {
    const purifyConfig = {
      ALLOWED_TAGS: options.allowedTags || ["b", "i", "em", "strong", "p", "br", "span"],
      ALLOWED_ATTR: options.allowedAttributes || ["class", "id"],
      FORCE_BODY: true,
      RETURN_DOM: false,
    };
    val = purifier.sanitize(val, purifyConfig);
  } else {
    // Neutralize dangerous event listener attributes and URL protocols for plain-text escaping
    val = val.replace(/(on[a-z]+)\s*=\s*("[^"]*"|'[^']*'|[^>\s]*)/gi, "");
    val = val.replace(/(javascript|data|vbscript)\s*:/gi, "$1_blocked:");
    val = escapeHtml(val);
  }

  return {
    ...result,
    value: val,
    changed: val !== normalizeInput(value),
  };
}

export function sanitizeSearchQuery(value: unknown, maxLength = 160): SanitizationResult {
  const result = sanitizeCryptoInput(value, {
    kind: "search",
    maxLength,
    allowNewlines: false,
    trim: true,
    collapseWhitespace: true,
    escapeHtml: false,
  });

  const withoutOperators = result.value.replace(/[<>]/g, "");
  const warnings = [...result.warnings];

  if (withoutOperators !== result.value) {
    warnings.push("Search query contained unsafe angle brackets and they were removed.");
  }

  return {
    value: withoutOperators,
    changed: withoutOperators !== normalizeInput(value),
    removedCharacters: Math.max(0, normalizeInput(value).length - withoutOperators.length),
    warnings,
  };
}

export function sanitizeHexInput(value: unknown, maxLength = 8192): SanitizationResult {
  const original = normalizeInput(value);
  const cleaned = original.replace(/^0x/i, "").replace(/\s+/g, "").toUpperCase();
  let sanitized = cleaned.replace(/[^A-F0-9]/g, "");
  const warnings: string[] = [];

  if (sanitized.length !== cleaned.length) {
    warnings.push("Non-hexadecimal characters were removed.");
  }

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
    warnings.push(`Hex input was truncated to ${maxLength} characters.`);
  }

  return {
    value: sanitized,
    changed: sanitized !== original,
    removedCharacters: Math.max(0, original.length - sanitized.length),
    warnings,
  };
}

export function sanitizeIdentifier(value: unknown, maxLength = 80): SanitizationResult {
  const original = normalizeInput(value);
  let sanitized = original.trim().replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

  if (sanitized.length > maxLength) sanitized = sanitized.slice(0, maxLength);

  const isEmptyOrOnlySeparators = !sanitized || /^[-_]+$/.test(sanitized);

  return {
    value: sanitized,
    changed: sanitized !== original,
    removedCharacters: Math.max(0, original.length - sanitized.length),
    warnings: isEmptyOrOnlySeparators ? ["Identifier became empty after sanitization."] : [],
  };
}

export function sanitizeUrl(value: unknown, allowedProtocols = ["https:", "http:"]): SanitizationResult {
  const original = normalizeInput(value).trim();
  const warnings: string[] = [];

  if (!original) {
    return {
      value: "",
      changed: false,
      removedCharacters: 0,
      warnings: ["URL is empty."],
    };
  }

  try {
    const parsed = new URL(original);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return {
        value: "",
        changed: true,
        removedCharacters: original.length,
        warnings: [`URL protocol ${parsed.protocol} is not allowed.`],
      };
    }

    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";

    return {
      value: parsed.toString(),
      changed: parsed.toString() !== original,
      removedCharacters: Math.max(0, original.length - parsed.toString().length),
      warnings,
    };
  } catch {
    return {
      value: "",
      changed: true,
      removedCharacters: original.length,
      warnings: ["Invalid URL was removed."],
    };
  }
}

export function sanitizeMarkdown(value: unknown, maxLength = DEFAULT_MAX_LENGTH): SanitizationResult {
  const plain = sanitizePlainText(value, {
    kind: "markdown",
    maxLength,
    allowNewlines: true,
    trim: true,
    collapseWhitespace: false,
  });

  const withoutDangerousLinks = plain.value.replace(
    /\]\(\s*(javascript:|javascript_blocked:|data:text\/html|vbscript:)[^)]+\)/gi,
    "](#)",
  );
  const withoutRawHtml = withoutDangerousLinks.replace(/&lt;\/?(script|iframe|object|embed|style)[^&]*&gt;/gi, "");
  const warnings = [...plain.warnings];

  if (withoutRawHtml !== plain.value) {
    warnings.push("Dangerous markdown HTML or link targets were neutralized.");
  }

  return {
    value: withoutRawHtml,
    changed: withoutRawHtml !== normalizeInput(value),
    removedCharacters: Math.max(0, normalizeInput(value).length - withoutRawHtml.length),
    warnings,
  };
}

export function sanitizeUserInput(value: unknown, options: SanitizationOptions = {}): SanitizationResult {
  switch (options.kind ?? "plain-text") {
    case "hex":
      return sanitizeHexInput(value, options.maxLength);
    case "search":
      return sanitizeSearchQuery(value, options.maxLength);
    case "url":
      return sanitizeUrl(value);
    case "markdown":
      return sanitizeMarkdown(value, options.maxLength);
    case "identifier":
      return sanitizeIdentifier(value, options.maxLength);
    case "plain-text":
    default:
      return sanitizePlainText(value, options);
  }
}

export function sanitizeRecord<T extends Record<string, unknown>>(
  record: T,
  schema: Partial<Record<keyof T, SanitizationOptions>>,
): Record<keyof T, SanitizationResult> {
  return Object.keys(record).reduce((acc, key) => {
    const typedKey = key as keyof T;
    acc[typedKey] = sanitizeUserInput(record[typedKey], schema[typedKey] ?? {});
    return acc;
  }, {} as Record<keyof T, SanitizationResult>);
}

export function sanitizedValue(value: unknown, options: SanitizationOptions = {}): string {
  return sanitizeUserInput(value, options).value;
}

export function buildSanitizationChecklist(): string[] {
  return [
    "Use sanitizeSearchQuery for search boxes and filter inputs.",
    "Use sanitizeHexInput before passing values into cipher or hash helpers.",
    "Use sanitizePlainText for names, labels, titles, and short notes.",
    "Use sanitizeMarkdown only for markdown-like content and keep dangerous links neutralized.",
    "Use sanitizeUrl for external references and reject javascript/data URL protocols.",
    "Use sanitizeRecord for form submissions with multiple input fields.",
    "Add focused tests for each input surface touched by the change.",
  ];
}
