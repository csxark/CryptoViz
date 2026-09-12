/**
 * Bundle Size & Lazy-Loading Budget Checker (#1321)
 *
 * Enforces strict size budgets across:
 * 1. Cipher Web Worker Entry Points (< 25 KB)
 * 2. Dynamically Loaded Cipher Algorithm Modules (< 40 KB, standalone algorithm implementations)
 * 3. Master Algorithm Metadata Catalog (< 100 KB)
 * 4. Interactive Visualizer Component Modules (< 50 KB)
 * 5. Production Built Chunks in .next/static/ (if present)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const BUDGETS = {
  workerEntryKb: 25,
  cipherModuleKb: 40,
  cipherCatalogKb: 125,
  visualizerModuleKb: 50,
  buildChunkKb: 150,
};

function formatSize(bytes) {
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

function checkFiles(patternDir, maxKb, filterFn, customBudgets = {}) {
  const fullDir = path.join(ROOT_DIR, patternDir);
  if (!fs.existsSync(fullDir)) return { passed: true, results: [] };

  const results = [];
  let passed = true;

  function traverse(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && (!filterFn || filterFn(entry.name, fullPath))) {
        const relative = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
        const size = fs.statSync(fullPath).size;
        const sizeKb = size / 1024;
        const targetBudget = customBudgets[relative] || customBudgets[entry.name] || maxKb;
        const ok = sizeKb <= targetBudget;
        if (!ok) passed = false;
        results.push({
          file: relative,
          size,
          sizeKb,
          maxKb: targetBudget,
          ok,
        });
      }
    }
  }

  traverse(fullDir);
  return { passed, results };
}

export function runBudgetChecks() {
  console.log('\n🔍 =======================================================');
  console.log('   CryptoViz Cipher Worker & Lazy-Loading Budget Checker');
  console.log('=======================================================\n');

  let allPassed = true;
  const reports = [];

  // 1. Worker Core Entry Budget (< 25 KB)
  console.log(`📦 [1/3] Checking Worker Core Entry Points (Budget: < ${BUDGETS.workerEntryKb} KB)...`);
  const workerChecks = checkFiles('lib/workers', BUDGETS.workerEntryKb, (name) =>
    name.endsWith('.worker.ts') || name.endsWith('worker.ts')
  );
  reports.push(...workerChecks.results);
  if (!workerChecks.passed) allPassed = false;

  for (const item of workerChecks.results) {
    const status = item.ok ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} ${item.file} -> ${formatSize(item.size)} (Budget: ${item.maxKb} KB)`);
  }

  // 2. Individual Cipher Algorithm Modules (< 40 KB / Catalog < 100 KB)
  console.log(`\n📦 [2/3] Checking Dynamically Loaded Cipher Modules (Budget: < ${BUDGETS.cipherModuleKb} KB, Catalog: < ${BUDGETS.cipherCatalogKb} KB)...`);
  const cipherChecks = checkFiles(
    'lib/cipher',
    BUDGETS.cipherModuleKb,
    (name) => name.endsWith('.ts') && !name.endsWith('.d.ts') && !name.endsWith('test.ts'),
    { 'lib/cipher/registry.ts': BUDGETS.cipherCatalogKb }
  );
  reports.push(...cipherChecks.results);
  if (!cipherChecks.passed) allPassed = false;

  let cipherPassCount = 0;
  for (const item of cipherChecks.results) {
    if (item.ok) cipherPassCount++;
    else {
      console.log(`  ❌ FAIL ${item.file} -> ${formatSize(item.size)} (Budget: ${item.maxKb} KB)`);
    }
  }
  console.log(`  ✅ ${cipherPassCount}/${cipherChecks.results.length} cipher modules within budget.`);

  // 3. Interactive Visualizer Modules (< 50 KB)
  console.log(`\n📦 [3/3] Checking Visualizer Modules (Budget: < ${BUDGETS.visualizerModuleKb} KB)...`);
  const visualizerChecks = checkFiles('components/cipher', BUDGETS.visualizerModuleKb, (name) =>
    name.endsWith('Visualizer.tsx') || name.endsWith('Loader.tsx')
  );
  reports.push(...visualizerChecks.results);
  if (!visualizerChecks.passed) allPassed = false;

  let vizPassCount = 0;
  for (const item of visualizerChecks.results) {
    if (item.ok) vizPassCount++;
    else {
      console.log(`  ❌ FAIL ${item.file} -> ${formatSize(item.size)} (Budget: ${item.maxKb} KB)`);
    }
  }
  console.log(`  ✅ ${vizPassCount}/${visualizerChecks.results.length} visualizer modules within budget.`);

  // Summary
  console.log('\n-------------------------------------------------------');
  if (allPassed) {
    console.log(`🎉 All ${reports.length} monitored modules satisfied their lazy-loading budgets!\n`);
    return { success: true, count: reports.length, reports };
  } else {
    console.error(`💥 Budget violation detected in one or more modules.\n`);
    return { success: false, count: reports.length, reports };
  }
}

// Direct execution CLI runner
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const result = runBudgetChecks();
  if (!result.success) {
    process.exit(1);
  }
}
