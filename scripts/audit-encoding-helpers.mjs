#!/usr/bin/env node
/**
 * Encoding-helper migration audit for CryptoViz.
 *
 * Usage:
 *   node scripts/audit-encoding-helpers.mjs
 *   node scripts/audit-encoding-helpers.mjs --fail
 *
 * The script deliberately does not rewrite source files. Cryptographic code can have
 * subtly different validation requirements, so each migration should import the shared
 * helper and retain cipher-specific length checks at the call site.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const INCLUDE = [
  path.join(ROOT, 'lib', 'cipher'),
];
const EXCLUDE_PARTS = [
  `${path.sep}node_modules${path.sep}`,
  `${path.sep}.next${path.sep}`,
  `${path.sep}.git${path.sep}`,
];

const FUNCTION_PATTERNS = [
  /function\s+parseHex\s*\(/g,
  /function\s+toHex\s*\(/g,
  /const\s+parseHex\s*=\s*(?:async\s*)?\(/g,
  /const\s+toHex\s*=\s*(?:async\s*)?\(/g,
  /(?:export\s+)?(?:const|let|var)\s+parseHex\s*=/g,
  /(?:export\s+)?(?:const|let|var)\s+toHex\s*=/g,
];

function walk(directory) {
  const result = [];
  if (!fs.existsSync(directory)) return result;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (EXCLUDE_PARTS.some((part) => absolute.includes(part))) continue;

    if (entry.isDirectory()) {
      result.push(...walk(absolute));
      continue;
    }

    if (entry.isFile() && /\.(?:ts|tsx|js|jsx)$/.test(entry.name)) {
      result.push(absolute);
    }
  }
  return result;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function auditFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const matches = [];

  for (const pattern of FUNCTION_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const helper = /parseHex/.test(match[0]) ? 'parseHex' : 'toHex';
      matches.push({
        helper,
        line: lineNumberAt(text, match.index),
      });
    }
  }

  return matches.sort((a, b) => a.line - b.line);
}

const files = INCLUDE.flatMap(walk);
const findings = [];

for (const file of files) {
  const matches = auditFile(file);
  if (matches.length === 0) continue;

  findings.push({
    file: path.relative(ROOT, file),
    matches,
  });
}

const duplicateDefinitions = findings.reduce((count, item) => count + item.matches.length, 0);

console.log('CryptoViz encoding-helper audit');
console.log('--------------------------------');
console.log(`Scanned ${files.length} source files under lib/cipher.`);
console.log(`Local parseHex/toHex definitions found: ${duplicateDefinitions}.`);

if (findings.length > 0) {
  for (const item of findings) {
    const detail = item.matches
      .map((match) => `${match.helper}@${match.line}`)
      .join(', ');
    console.log(`- ${item.file}: ${detail}`);
  }
} else {
  console.log('PASS: no local parseHex/toHex helper definitions remain.');
}

if (process.argv.includes('--fail') && duplicateDefinitions > 0) {
  process.exitCode = 1;
}
