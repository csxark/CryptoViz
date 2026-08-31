#!/usr/bin/env node
/**
 * Standardize JSDoc for public cipher-engine exports.
 *
 * The script deliberately works on source text rather than requiring a
 * compiler API, so it can be used in the repository's existing toolchain.
 * It handles exported functions, async functions, classes, const/let/var
 * declarations, and exported type/interface declarations.
 *
 * Usage:
 *   node scripts/standardize-cipher-jsdoc.mjs
 *   node scripts/standardize-cipher-jsdoc.mjs --check
 *   node scripts/standardize-cipher-jsdoc.mjs --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CIPHER_ROOT = path.join(ROOT, "lib", "cipher");
const CHECK = process.argv.includes("--check");
const DRY_RUN = process.argv.includes("--dry-run");

const STANDARD_LINKS = Object.freeze([
  ["AES", "FIPS 197", "https://csrc.nist.gov/pubs/fips/197/final"],
  ["AES-GCM", "NIST SP 800-38D", "https://csrc.nist.gov/pubs/sp/800/38/d/final"],
  ["AES-CCM", "NIST SP 800-38C", "https://csrc.nist.gov/pubs/sp/800/38/c/upd1/final"],
  ["AES-XTS", "NIST SP 800-38E", "https://csrc.nist.gov/pubs/sp/800/38/e/final"],
  ["DES", "FIPS 46-3", "https://csrc.nist.gov/pubs/fips/46-3/final"],
  ["ChaCha20-Poly1305", "RFC 8439", "https://www.rfc-editor.org/rfc/rfc8439"],
  ["Camellia", "RFC 3713", "https://www.rfc-editor.org/rfc/rfc3713"],
  ["SM4", "RFC 8998", "https://www.rfc-editor.org/rfc/rfc8998"],
  ["LEA", "RFC 9998", "https://www.rfc-editor.org/rfc/rfc9998"],
  ["RC2", "RFC 2268", "https://www.rfc-editor.org/rfc/rfc2268"],
  ["GOST 28147", "RFC 5830", "https://www.rfc-editor.org/rfc/rfc5830"],
  ["XMSS", "RFC 8391", "https://www.rfc-editor.org/rfc/rfc8391"],
  ["LMS", "RFC 8554", "https://www.rfc-editor.org/rfc/rfc8554"],
  ["EdDSA", "RFC 8032", "https://www.rfc-editor.org/rfc/rfc8032"],
  ["ML-KEM", "FIPS 203", "https://csrc.nist.gov/pubs/fips/203/final"],
  ["ML-DSA", "FIPS 204", "https://csrc.nist.gov/pubs/fips/204/final"],
  ["SLH-DSA", "FIPS 205", "https://csrc.nist.gov/pubs/fips/205/final"],
  ["FF1", "NIST SP 800-38G", "https://csrc.nist.gov/pubs/sp/800/38/g/upd1/final"],
  ["SHA-1", "FIPS 180-4", "https://csrc.nist.gov/pubs/fips/180-4/upd1/final"],
  ["SHA-2", "FIPS 180-4", "https://csrc.nist.gov/pubs/fips/180-4/upd1/final"],
  ["SHA-3", "FIPS 202", "https://csrc.nist.gov/pubs/fips/202/final"],
  ["SHAKE", "FIPS 202", "https://csrc.nist.gov/pubs/fips/202/final"],
  ["SM3", "GB/T 32905-2016", "https://www.iso.org/standard/67116.html"],
  ["Streebog", "GOST R 34.11-2012", "https://www.rfc-editor.org/rfc/rfc6986"],
  ["Whirlpool", "NESSIE specification", "https://www.schneier.com/academic/archives/2000/11/whirlpool.html"],
  ["RIPEMD-160", "ISO/IEC 10118-3 family", "https://www.iso.org/standard/67116.html"],
  ["BLAKE2", "RFC 7693", "https://www.rfc-editor.org/rfc/rfc7693"],
  ["BLAKE3", "BLAKE3 specification", "https://github.com/BLAKE3-team/BLAKE3"],
  ["HMAC", "RFC 2104", "https://www.rfc-editor.org/rfc/rfc2104"],
  ["HKDF", "RFC 5869", "https://www.rfc-editor.org/rfc/rfc5869"],
  ["PBKDF2", "RFC 8018", "https://www.rfc-editor.org/rfc/rfc8018"],
  ["Classical ciphers", "Historical specification", "https://en.wikipedia.org/wiki/Classical_cipher"],
  ["Cryptographic hash", "Primary algorithm specification", "https://en.wikipedia.org/wiki/Cryptographic_hash_function"],
]);

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) result.push(full);
  }
  return result;
}

function normalizeName(name) {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function familyForFile(file) {
  const relative = path.relative(CIPHER_ROOT, file).replaceAll(path.sep, "/");
  const lower = relative.toLowerCase();
  if (lower.includes("/symmetric/") || lower.includes("/aes")) return "symmetric cipher";
  if (lower.includes("/asymmetric/") || lower.includes("rsa") || lower.includes("ecc")) return "asymmetric primitive";
  if (lower.includes("/hash/") || lower.includes("hash")) return "cryptographic hash";
  if (lower.includes("/fpe/")) return "format-preserving encryption";
  if (lower.includes("/classical/")) return "classical cipher";
  if (lower.includes("/kalyna/") || lower.includes("/kupyna/")) return "standardized cipher/hash primitive";
  return "cipher-engine utility";
}

function standardFor(file, source) {
  const haystack = `${path.basename(file)}\n${source}`.toLowerCase();
  for (const [name, body, url] of STANDARD_LINKS) {
    if (haystack.includes(name.toLowerCase())) return { name, body, url };
  }
  return {
    name: "Primary algorithm specification",
    body: "Primary algorithm specification",
    url: "https://en.wikipedia.org/wiki/Cryptography",
  };
}

function hasJSDocImmediatelyBefore(source, index) {
  const before = source.slice(0, index);
  const match = before.match(/(?:\s|^)(\/\*\*[\s\S]*?\*\/)\s*$/);
  return Boolean(match);
}

function findDeclarationName(line) {
  const patterns = [
    /\bexport\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
    /\bexport\s+default\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/,
    /\bexport\s+class\s+([A-Za-z_$][\w$]*)/,
    /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/,
    /\bexport\s+(?:interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/,
  ];
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractParameters(signature) {
  const open = signature.indexOf("(");
  if (open < 0) return [];
  let depth = 0;
  let quote = null;
  let escaped = false;
  let close = -1;

  for (let i = open; i < signature.length; i += 1) {
    const char = signature[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(" || char === "[" || char === "{") depth += 1;
    if (char === ")" || char === "]" || char === "}") depth -= 1;
    if (char === ")" && depth === 0) {
      close = i;
      break;
    }
  }

  if (close < 0) return [];
  const raw = signature.slice(open + 1, close).trim();
  if (!raw) return [];

  const params = [];
  let start = 0;
  depth = 0;
  quote = null;
  escaped = false;

  for (let i = 0; i <= raw.length; i += 1) {
    const char = raw[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if ("([{<".includes(char)) depth += 1;
    if (")]} >".replaceAll(" ", "").includes(char)) depth -= 1;
    if ((char === "," && depth === 0) || i === raw.length) {
      const piece = raw.slice(start, i).trim();
      if (piece) {
        const name = piece
          .replace(/^\.\.\./, "")
          .split("=")[0]
          .split(":")[0]
          .trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) params.push(name);
      }
      start = i + 1;
    }
  }
  return params;
}

function makeDoc(name, file, source, signature) {
  const family = familyForFile(file);
  const standard = standardFor(file, source);
  const params = extractParameters(signature);

  const lines = [
    "/**",
    ` * ${normalizeName(name)} ${family} export.`,
    " *",
    " * This API is intentionally documented at the engine boundary so callers",
    " * can understand the input contract without opening the implementation.",
  ];

  for (const parameter of params) {
    lines.push(` * @param ${parameter} Input required by the ${normalizeName(name)} operation.`);
  }

  lines.push(
    " * @returns The operation result produced by the cipher engine.",
    ` * @see ${standard.url} — ${standard.body}.`,
    " */",
  );

  return lines.join("\n");
}

function isPublicExportLine(line) {
  return /\bexport\s+(?:(?:async)\s+)?(?:function|class|const|let|var|interface|type|enum|namespace)\b/.test(line);
}

function annotateFile(file) {
  const original = fs.readFileSync(file, "utf8");
  const lines = original.split(/\r?\n/);
  const output = [];
  let changed = false;
  let pendingSignature = null;

  for (const line of lines) {
    const declaration = findDeclarationName(line);

    if (declaration && isPublicExportLine(line)) {
      const currentOffset = output.join("\n").length;
      const reconstructed = `${output.join("\n")}\n${line}`;
      if (!hasJSDocImmediatelyBefore(reconstructed, currentOffset + 1)) {
        const doc = makeDoc(declaration, file, original, line);
        output.push(doc);
        changed = true;
      }
      pendingSignature = declaration;
    }

    output.push(line);

    // A multi-line exported function can begin with an `export` line but have
    // its parameters on following lines. The generated summary remains useful
    // even when parameters cannot be extracted from the first line.
    if (pendingSignature && line.includes("=>")) pendingSignature = null;
  }

  const updated = output.join("\n");
  if (changed && !DRY_RUN && !CHECK) fs.writeFileSync(file, updated);
  return { file, changed, original, updated };
}

function validateJSDoc(file, source) {
  const lines = source.split(/\r?\n/);
  const failures = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!isPublicExportLine(lines[i])) continue;
    const name = findDeclarationName(lines[i]);
    if (!name) continue;

    let j = i - 1;
    while (j >= 0 && lines[j].trim() === "") j -= 1;
    if (j < 0 || !lines[j].includes("*/")) {
      failures.push(`${file}:${i + 1} ${name}: missing JSDoc`);
      continue;
    }

    let start = j;
    while (start >= 0 && !lines[start].includes("/**")) start -= 1;
    const block = start >= 0 ? lines.slice(start, j + 1).join("\n") : "";
    if (!/@returns\b/.test(block) && !/\binterface\b|\btype\b|\benum\b|\bnamespace\b/.test(lines[i])) {
      failures.push(`${file}:${i + 1} ${name}: missing @returns`);
    }
    if (!/@see\s+https?:\/\//.test(block)) {
      failures.push(`${file}:${i + 1} ${name}: missing standard/primary reference`);
    }
  }
  return failures;
}

function main() {
  if (!fs.existsSync(CIPHER_ROOT)) {
    console.error(`Cipher root does not exist: ${CIPHER_ROOT}`);
    process.exit(1);
  }

  const files = walk(CIPHER_ROOT);
  const results = files.map(annotateFile);
  const changed = results.filter((item) => item.changed);
  const failures = [];

  if (CHECK) {
    for (const file of files) {
      failures.push(...validateJSDoc(file, fs.readFileSync(file, "utf8")));
    }
  }

  console.log(`Scanned ${files.length} cipher source files.`);
  console.log(`${changed.length} files require or received standardized JSDoc.`);
  console.log(`Standard references available: ${STANDARD_LINKS.length}.`);

  if (CHECK && failures.length) {
    console.error(`Found ${failures.length} documentation failures.`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  if (CHECK) console.log("JSDoc coverage check passed.");
  if (DRY_RUN) console.log("Dry run: no source files were changed.");
}

main();
