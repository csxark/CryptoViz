import type { CipherDefinition } from "./registry";
import type { CipherOptions } from "./types";
import { CipherError, type CipherErrorCode } from "../utils/errors";

export type ParameterSource = "input" | "key" | "option";

export type ParameterType =
  | "string"
  | "number"
  | "numberString"
  | "boolean"
  | "hex"
  | "enum"
  | "composite";

export interface ParameterPart {
  id: string;
  label: string;
  type: ParameterType;
  required?: boolean;
  exactLengthBytes?: number;
  allowedLengthsBytes?: number[];
  min?: number;
  max?: number;
  integer?: boolean;
  pattern?: string;
}

export interface ParameterRule {
  id: string;
  label: string;
  source: ParameterSource;
  type: ParameterType;
  required?: boolean;
  description?: string;
  warning?: string;
  min?: number;
  max?: number;
  integer?: boolean;
  minLength?: number;
  maxLength?: number;
  exactLengthBytes?: number;
  allowedLengthsBytes?: number[];
  choices?: unknown[];
  pattern?: string;
  parts?: ParameterPart[];
  separator?: string;
  distinctParts?: string[];
}

export interface ParameterDependency {
  when: {
    parameter: string;
    equals?: unknown;
    notEquals?: unknown;
  };
  require?: string[];
  forbid?: string[];
}

export interface CipherParameterSchema {
  cipherId: string;
  parameters: ParameterRule[];
  dependencies?: ParameterDependency[];
  warnings?: string[];
}

export interface ParameterValidationIssue {
  parameter: string;
  code: CipherErrorCode;
  message: string;
  expected?: unknown;
  actual?: unknown;
}

export interface ParameterValidationResult {
  valid: boolean;
  issues: ParameterValidationIssue[];
  warnings: string[];
}

function getParameterValue(
  rule: ParameterRule,
  input: string,
  key: string,
  options: CipherOptions,
): unknown {
  if (rule.source === "input") return input;
  if (rule.source === "key") return key;
  return options[rule.id];
}

function displayExpected(rule: ParameterRule): string {
  if (rule.allowedLengthsBytes?.length) {
    return rule.allowedLengthsBytes.join(", ") + " bytes";
  }

  if (rule.exactLengthBytes !== undefined) {
    return `${rule.exactLengthBytes} bytes`;
  }

  if (rule.min !== undefined && rule.max !== undefined) {
    return `${rule.min}–${rule.max}`;
  }

  if (rule.choices?.length) {
    return rule.choices.join(", ");
  }

  return rule.type;
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateHex(
  value: unknown,
  rule: ParameterRule | ParameterPart,
): ParameterValidationIssue | undefined {
  if (typeof value !== "string") {
    return {
      parameter: rule.id,
      code: "INVALID_OPTION",
      message: `${rule.label} must be a hexadecimal string.`,
      expected: "hexadecimal string",
      actual: typeof value,
    };
  }

  const normalized = value.replace(/\s+/g, "");

  if (normalized.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(normalized)) {
    return {
      parameter: rule.id,
      code: "INVALID_OPTION",
      message: `${rule.label} must contain only hexadecimal characters with an even length.`,
      expected: "even-length hexadecimal string",
      actual: value,
    };
  }

  const bytes = normalized.length / 2;

  if (
    rule.exactLengthBytes !== undefined &&
    bytes !== rule.exactLengthBytes
  ) {
    return {
      parameter: rule.id,
      code: "INVALID_KEY_LENGTH",
      message: `${rule.label} must be exactly ${rule.exactLengthBytes} bytes.`,
      expected: `${rule.exactLengthBytes} bytes`,
      actual: `${bytes} bytes`,
    };
  }

  if (
    rule.allowedLengthsBytes &&
    !rule.allowedLengthsBytes.includes(bytes)
  ) {
    return {
      parameter: rule.id,
      code: "INVALID_KEY_LENGTH",
      message: `${rule.label} must be ${displayExpected(rule as any)}.`,
      expected: rule.allowedLengthsBytes,
      actual: bytes,
    };
  }

  return undefined;
}

function validateScalar(
  value: unknown,
  rule: ParameterRule,
): ParameterValidationIssue | undefined {
  if (value === undefined || value === null || value === "") {
    if (rule.required) {
      return {
        parameter: rule.id,
        code:
          rule.source === "key"
            ? "INVALID_KEY"
            : rule.source === "input"
              ? "INPUT_REQUIRED"
              : "INVALID_OPTION",
        message: `${rule.label} is required.`,
        expected: displayExpected(rule as any),
      };
    }

    return undefined;
  }

  switch (rule.type) {
    case "string":
      if (typeof value !== "string") {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be a string.`,
          expected: "string",
          actual: typeof value,
        };
      }

      if (
        rule.minLength !== undefined &&
        value.length < rule.minLength
      ) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must contain at least ${rule.minLength} characters.`,
          expected: rule.minLength,
          actual: value.length,
        };
      }

      if (
        rule.maxLength !== undefined &&
        value.length > rule.maxLength
      ) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must contain at most ${rule.maxLength} characters.`,
          expected: rule.maxLength,
          actual: value.length,
        };
      }
      break;

    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be a finite number.`,
          expected: "finite number",
          actual: value,
        };
      }

      if (rule.integer && !Number.isInteger(value)) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be an integer.`,
          expected: "integer",
          actual: value,
        };
      }

      if (rule.min !== undefined && value < rule.min) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be at least ${rule.min}.`,
          expected: rule.min,
          actual: value,
        };
      }

      if (rule.max !== undefined && value > rule.max) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be at most ${rule.max}.`,
          expected: rule.max,
          actual: value,
        };
      }
      break;

    case "numberString": {
      if (typeof value !== "string" || !/^[+-]?\d+$/.test(value.trim())) {
        return {
          parameter: rule.id,
          code: "INVALID_KEY",
          message: `${rule.label} must be an integer value.`,
          expected: "integer string",
          actual: value,
        };
      }

      const numericValue = Number(value);

      if (
        rule.min !== undefined &&
        numericValue < rule.min
      ) {
        return {
          parameter: rule.id,
          code: "INVALID_KEY",
          message: `${rule.label} must be at least ${rule.min}.`,
          expected: rule.min,
          actual: numericValue,
        };
      }

      if (
        rule.max !== undefined &&
        numericValue > rule.max
      ) {
        return {
          parameter: rule.id,
          code: "INVALID_KEY",
          message: `${rule.label} must be at most ${rule.max}.`,
          expected: rule.max,
          actual: numericValue,
        };
      }
      break;
    }

    case "boolean":
      if (typeof value !== "boolean") {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be true or false.`,
          expected: "boolean",
          actual: typeof value,
        };
      }
      break;

    case "hex":
      return validateHex(value, rule);

    case "enum":
      if (!rule.choices?.includes(value)) {
        return {
          parameter: rule.id,
          code: "INVALID_OPTION",
          message: `${rule.label} must be one of: ${rule.choices?.join(", ")}.`,
          expected: rule.choices,
          actual: value,
        };
      }
      break;

    case "composite": {
      if (typeof value !== "string") {
        return {
          parameter: rule.id,
          code: "INVALID_KEY",
          message: `${rule.label} must be a string.`,
          expected: "composite string",
          actual: typeof value,
        };
      }

      const parts = value.split(rule.separator ?? "|");

      if (!rule.parts || parts.length !== rule.parts.length) {
        return {
          parameter: rule.id,
          code: "INVALID_KEY",
          message: `${rule.label} must contain exactly ${rule.parts?.length ?? 0} parts separated by "${rule.separator ?? "|"}".`,
          expected: rule.parts?.map((part) => part.label),
          actual: parts.length,
        };
      }

      for (let index = 0; index < rule.parts.length; index += 1) {
        const part = rule.parts[index];
        const issue = validateScalar(parts[index], {
          id: part.id,
          label: part.label,
          source: "key",
          type: part.type,
          required: part.required ?? true,
          min: part.min,
          max: part.max,
          integer: part.integer,
          exactLengthBytes: part.exactLengthBytes,
          allowedLengthsBytes: part.allowedLengthsBytes,
          pattern: part.pattern,
        });

        if (issue) return issue;
      }

      if (rule.distinctParts?.length) {
        const indexes = rule.distinctParts.map((id) =>
          rule.parts!.findIndex((part) => part.id === id),
        );

        const values = indexes.map((index) => parts[index]);

        if (
          values.length > 1 &&
          new Set(values).size !== values.length
        ) {
          return {
            parameter: rule.id,
            code: "INVALID_KEY",
            message: `${rule.label} requires the selected key parts to be different.`,
            expected: "distinct key parts",
            actual: values,
          };
        }
      }

      break;
    }
  }

  if (rule.pattern && typeof value === "string") {
    if (!new RegExp(rule.pattern).test(value)) {
      return {
        parameter: rule.id,
        code: "INVALID_OPTION",
        message: `${rule.label} does not match the required format.`,
        expected: rule.pattern,
        actual: value,
      };
    }
  }

  return undefined;
}

function mergeSchema(
  base: CipherParameterSchema,
  override?: Partial<CipherParameterSchema>,
): CipherParameterSchema {
  if (!override) return base;

  return {
    ...base,
    ...override,
    parameters: override.parameters ?? base.parameters,
    dependencies: override.dependencies ?? base.dependencies,
    warnings: override.warnings ?? base.warnings,
  };
}

const ALGORITHM_SCHEMAS: Record<
  string,
  Partial<CipherParameterSchema>
> = {
  aes: {
    parameters: [
      {
        id: "key",
        label: "AES key",
        source: "key",
        type: "hex",
        required: true,
        allowedLengthsBytes: [16, 24, 32],
        description: "AES accepts 128-, 192-, or 256-bit keys.",
      },
      {
        id: "mode",
        label: "AES mode",
        source: "option",
        type: "enum",
        choices: ["ECB", "CBC", "CTR", "CFB", "OFB"],
        description: "Select the block-cipher mode.",
      },
      {
        id: "iv",
        label: "Initialization vector",
        source: "option",
        type: "hex",
        exactLengthBytes: 16,
        description: "AES modes that use an IV require a 16-byte value when supplied.",
      },
      {
        id: "hexInput",
        label: "Hex input mode",
        source: "option",
        type: "boolean",
      },
    ],
    dependencies: [
      {
        when: {
          parameter: "mode",
          equals: "ECB",
        },
        forbid: ["iv"],
      },
    ],
    warnings: [
      "ECB mode provides no semantic protection for repeated plaintext blocks.",
    ],
  },

  "aes-xts": {
    parameters: [
      {
        id: "key",
        label: "AES-XTS key pair",
        source: "key",
        type: "composite",
        required: true,
        parts: [
          {
            id: "dataKey",
            label: "Data key",
            type: "hex",
            allowedLengthsBytes: [16, 24, 32],
          },
          {
            id: "tweakKey",
            label: "Tweak key",
            type: "hex",
            allowedLengthsBytes: [16, 24, 32],
          },
        ],
        distinctParts: ["dataKey", "tweakKey"],
        separator: "|",
        warning: "The XTS data and tweak keys must be different.",
      },
      {
        id: "input",
        label: "XTS input",
        source: "input",
        type: "string",
        required: true,
      },
    ],
    warnings: [
      "AES-XTS provides confidentiality but does not provide authentication.",
    ],
  },

  "aes-ccm": {
    parameters: [
      {
        id: "key",
        label: "AES-CCM parameters",
        source: "key",
        type: "composite",
        required: true,
        parts: [
          {
            id: "keyHex",
            label: "AES key",
            type: "hex",
            allowedLengthsBytes: [16, 24, 32],
          },
          {
            id: "nonceHex",
            label: "CCM nonce",
            type: "hex",
            exactLengthBytes: 12,
          },
          {
            id: "aadHex",
            label: "Associated data",
            type: "hex",
            required: false,
          },
        ],
        separator: "|",
      },
    ],
  },

  "chacha20-poly1305": {
    parameters: [
      {
        id: "key",
        label: "ChaCha20-Poly1305 parameters",
        source: "key",
        type: "composite",
        required: true,
        parts: [
          {
            id: "keyHex",
            label: "ChaCha20 key",
            type: "hex",
            exactLengthBytes: 32,
          },
          {
            id: "nonceHex",
            label: "Poly1305 nonce",
            type: "hex",
            exactLengthBytes: 12,
          },
          {
            id: "aadHex",
            label: "Associated data",
            type: "hex",
            required: false,
          },
        ],
        separator: "|",
      },
    ],
  },

  xchacha20: {
    parameters: [
      {
        id: "key",
        label: "XChaCha20 parameters",
        source: "key",
        type: "composite",
        required: true,
        parts: [
          {
            id: "keyHex",
            label: "XChaCha20 key",
            type: "hex",
            exactLengthBytes: 32,
          },
          {
            id: "nonceHex",
            label: "XChaCha20 nonce",
            type: "hex",
            exactLengthBytes: 24,
          },
        ],
        separator: "|",
      },
    ],
  },

  xsalsa20: {
    parameters: [
      {
        id: "key",
        label: "XSalsa20 parameters",
        source: "key",
        type: "composite",
        required: true,
        parts: [
          {
            id: "keyHex",
            label: "XSalsa20 key",
            type: "hex",
            exactLengthBytes: 32,
          },
          {
            id: "nonceHex",
            label: "XSalsa20 nonce",
            type: "hex",
            exactLengthBytes: 24,
          },
        ],
        separator: "|",
      },
    ],
  },

  des: {
    parameters: [
      {
        id: "key",
        label: "DES key",
        source: "key",
        type: "hex",
        required: true,
        exactLengthBytes: 8,
      },
    ],
    warnings: [
      "DES is obsolete and should only be used for educational or legacy compatibility purposes.",
    ],
  },

  "3des": {
    parameters: [
      {
        id: "key",
        label: "3DES key",
        source: "key",
        type: "hex",
        required: true,
        allowedLengthsBytes: [16, 24],
      },
    ],
    warnings: [
      "3DES is legacy cryptography and should not be selected for new systems.",
    ],
  },

  rsa: {
    parameters: [
      {
        id: "key",
        label: "RSA key parameters",
        source: "key",
        type: "string",
        required: true,
        minLength: 1,
      },
      {
        id: "inputEncoding",
        label: "RSA input encoding",
        source: "option",
        type: "enum",
        choices: ["integer", "text", "hex"],
      },
      {
        id: "demoMode",
        label: "RSA demo mode",
        source: "option",
        type: "boolean",
      },
    ],
    warnings: [
      "The visualizer may use small educational RSA parameters in demo mode; these are not production-secure.",
    ],
  },

  dh: {
    parameters: [
      {
        id: "key",
        label: "Diffie-Hellman parameters",
        source: "key",
        type: "string",
        required: true,
        pattern: "^\\s*(?:p\\s*=\\s*)?\\d+\\s*[,\\s]+(?:g\\s*=\\s*)?\\d+\\s*$",
      },
      {
        id: "bobSecret",
        label: "Bob secret",
        source: "option",
        type: "numberString",
        min: 1,
      },
    ],
    warnings: [
      "Small DH parameters are suitable for visualization only, not real security.",
    ],
  },

  dsa: {
    parameters: [
      {
        id: "key",
        label: "DSA key parameters",
        source: "key",
        type: "string",
        required: true,
        pattern: "^\\s*\\d+\\s*[,\\s]+\\d+\\s*[,\\s]+\\d+\\s*[,\\s]+\\d+\\s*$",
      },
    ],
    warnings: [
      "The visualizer's small DSA parameters are educational and are not production-strength parameters.",
    ],
  },

  ecdsa: {
    parameters: [
      {
        id: "key",
        label: "ECDSA private/public key",
        source: "key",
        type: "hex",
        required: true,
        exactLengthBytes: 32,
      },
    ],
  },

  pbkdf2: {
    parameters: [
      {
        id: "input",
        label: "Password",
        source: "input",
        type: "string",
        required: true,
      },
      {
        id: "key",
        label: "Salt",
        source: "key",
        type: "string",
        required: true,
        minLength: 1,
      },
      {
        id: "iterations",
        label: "PBKDF2 iterations",
        source: "option",
        type: "number",
        required: true,
        integer: true,
        min: 1,
        max: 10_000_000,
      },
      {
        id: "keyLength",
        label: "Derived key length",
        source: "option",
        type: "number",
        required: true,
        integer: true,
        min: 1,
        max: 1024,
      },
    ],
    warnings: [
      "Higher iteration counts improve password-cracking resistance but increase execution cost.",
    ],
  },

  argon2: {
    parameters: [
      {
        id: "memoryCost",
        label: "Memory cost",
        source: "option",
        type: "number",
        required: true,
        integer: true,
        min: 8,
        max: 1_048_576,
      },
      {
        id: "timeCost",
        label: "Time cost",
        source: "option",
        type: "number",
        required: true,
        integer: true,
        min: 1,
        max: 100,
      },
      {
        id: "parallelism",
        label: "Parallelism",
        source: "option",
        type: "number",
        required: true,
        integer: true,
        min: 1,
        max: 64,
      },
      {
        id: "keyLength",
        label: "Output length",
        source: "option",
        type: "number",
        required: true,
        integer: true,
        min: 4,
        max: 1024,
      },
    ],
  },
};

function createGenericSchema(
  definition: CipherDefinition,
): CipherParameterSchema {
  const parameters: ParameterRule[] = [
    {
      id: "input",
      label: "Input",
      source: "input",
      type: "string",
      required: true,
      minLength: 1,
    },
  ];

  if (definition.defaultKey.trim()) {
    parameters.push({
      id: "key",
      label: "Key",
      source: "key",
      type: "string",
      required: true,
      minLength: 1,
    });
  }

  for (const option of definition.options ?? []) {
    parameters.push({
      id: option.id,
      label: option.name,
      source: "option",
      type:
        option.type === "select"
          ? "enum"
          : option.type as any,
      choices: option.choices?.map((choice) => choice.value),
    });
  }

  return {
    cipherId: definition.id,
    parameters,
  };
}

export function buildCipherParameterSchema(
  definition: CipherDefinition,
): CipherParameterSchema {
  return mergeSchema(
    createGenericSchema(definition),
    ALGORITHM_SCHEMAS[definition.id],
  );
}

export function validateCipherParameters(
  definition: CipherDefinition,
  input: string,
  key: string,
  options: CipherOptions = {},
): ParameterValidationResult {
  const schema = buildCipherParameterSchema(definition);
  const issues: ParameterValidationIssue[] = [];

  for (const rule of schema.parameters) {
    const value = getParameterValue(rule, input, key, options);
    const issue = validateScalar(value, rule);

    if (issue) {
      issues.push(issue);
    }
  }

  for (const dependency of schema.dependencies ?? []) {
    const dependencyValue =
      dependency.when.parameter === "input"
        ? input
        : dependency.when.parameter === "key"
          ? key
          : options[dependency.when.parameter];

    const matches =
      dependency.when.equals !== undefined
        ? dependencyValue === dependency.when.equals
        : dependency.when.notEquals !== undefined
          ? dependencyValue !== dependency.when.notEquals
          : true;

    if (!matches) continue;

    for (const requiredParameter of dependency.require ?? []) {
      const value =
        requiredParameter === "input"
          ? input
          : requiredParameter === "key"
            ? key
            : options[requiredParameter];

      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        issues.push({
          parameter: requiredParameter,
          code: "INVALID_OPTION",
          message: `${requiredParameter} is required for the selected configuration.`,
          expected: "provided",
        });
      }
    }

    for (const forbiddenParameter of dependency.forbid ?? []) {
      const value =
        forbiddenParameter === "input"
          ? input
          : forbiddenParameter === "key"
            ? key
            : options[forbiddenParameter];

      if (value !== undefined && value !== null && value !== "") {
        issues.push({
          parameter: forbiddenParameter,
          code: "INVALID_OPTION",
          message: `${forbiddenParameter} cannot be used with the selected configuration.`,
          expected: "not provided",
          actual: value,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings: schema.warnings ?? [],
  };
}

export function assertValidCipherParameters(
  definition: CipherDefinition,
  input: string,
  key: string,
  options: CipherOptions = {},
): void {
  const result = validateCipherParameters(
    definition,
    input,
    key,
    options,
  );

  if (result.valid) return;

  const firstIssue = result.issues[0];

  throw new CipherError(
    firstIssue.code,
    firstIssue.message,
    {
      details: {
        type: "parameter-validation",
        cipherId: definition.id,
        parameter: firstIssue.parameter,
        expected: firstIssue.expected,
        actual: firstIssue.actual,
        issues: result.issues,
        warnings: result.warnings,
      },
    },
  );
}