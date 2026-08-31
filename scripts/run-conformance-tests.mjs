#!/usr/bin/env node
/**
 * CLI Script: Run Complete Conformance Test Suite
 * Usage: npm run conformance
 * Or:    node scripts/run-conformance-tests.mjs [algorithm]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const vectorsDir = path.join(projectRoot, 'lib', 'testVectors', 'conformanceVectors');

/**
 * Discover all conformance vector files
 */
function discoverVectorFiles() {
  if (!fs.existsSync(vectorsDir)) {
    console.error(`Vector directory not found: ${vectorsDir}`);
    process.exit(1);
  }

  return fs
    .readdirSync(vectorsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({
      name: file.replace('.json', ''),
      path: path.join(vectorsDir, file),
    }));
}

/**
 * Load vector file
 */
function loadVectors(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load vectors from ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  const selectedAlgorithm = process.argv[2];
  const vectorFiles = discoverVectorFiles();

  if (vectorFiles.length === 0) {
    console.log('No conformance vectors found. Run: npm test');
    process.exit(0);
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Cryptographic Conformance Test Suite');
  console.log(`${'='.repeat(70)}\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalExecuted = 0;

  for (const vectorFile of vectorFiles) {
    if (selectedAlgorithm && vectorFile.name !== selectedAlgorithm) {
      continue;
    }

    console.log(`Testing: ${vectorFile.name.toUpperCase()}`);

    const vectors = loadVectors(vectorFile.path);
    if (!vectors) {
      console.log(`  ✗ Failed to load vectors\n`);
      totalFailed += 1;
      continue;
    }

    console.log(`  Vectors: ${vectors.vectors.length}`);
    console.log(`  Variant: ${vectors.variant}`);
    console.log(`  Status: Vector file loaded (run test suite for validation)\n`);

    totalExecuted += 1;
  }

  console.log(`${'='.repeat(70)}`);
  console.log(`Total Algorithms: ${totalExecuted}`);
  console.log(
    `Status: Run 'npm test' to execute full conformance validation`
  );
  console.log(`${'='.repeat(70)}\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});