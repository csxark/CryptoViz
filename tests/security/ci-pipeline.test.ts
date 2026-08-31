import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('CI Pipeline Quality Gates (#1734)', () => {
  const ciPath = path.resolve(process.cwd(), '.github/workflows/ci.yml');

  it('.github/workflows/ci.yml exists', () => {
    expect(fs.existsSync(ciPath)).toBe(true);
  });

  it('enforces TypeScript type checking step in static job', () => {
    const content = fs.readFileSync(ciPath, 'utf8');
    const hasTsc = content.includes('npx tsc --noEmit') || content.includes('npm run typecheck');
    expect(hasTsc).toBe(true);
  });

  it('enforces production build step in build job', () => {
    const content = fs.readFileSync(ciPath, 'utf8');
    const hasBuild = content.includes('npm run build') || content.includes('next build');
    expect(hasBuild).toBe(true);
  });

  it('enforces merge gate verification', () => {
    const content = fs.readFileSync(ciPath, 'utf8');
    expect(content).toContain('merge-gate:');
    expect(content).toContain('Verify required CI jobs passed');
  });

  it('runs validate-ci-pipeline script successfully', () => {
    const { validateCIPipeline } = require('../../scripts/validate-ci-pipeline.mjs');
    const result = validateCIPipeline();
    expect(result.success).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
  });
});
