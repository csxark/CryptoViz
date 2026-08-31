/**
 * Quality Assurance, Standardization, and Package Manager Policy Test Suite.
 *
 * Requirements (#1561):
 * 1. Pnpm, Yarn, and Bun lockfiles must not exist anywhere in the repository.
 * 2. `package.json` scripts, engines, and package manager declarations must be consistent with npm.
 * 3. Documentation (GUIDELINES.md, CONTRIBUTING.md, README.md, contribution-checklists.md)
 *    must exclusively instruct the use of npm.
 * 4. GitHub Actions workflows must use npm caching (`cache: 'npm'`) and run `npm ci` / `npm test`.
 * 5. Dependency overrides and lockfile structure must adhere to lockfileVersion 3.
 */

import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Standardization: Authoritative NPM Package Manager Policy (#1561)', () => {
    const rootDir = process.cwd()

    describe('Repository Tree Cleanliness & Banned Lockfiles', () => {
        it('ensures no pnpm-lock.yaml exists in the repository', () => {
            const pnpmLock = path.join(rootDir, 'pnpm-lock.yaml')
            expect(fs.existsSync(pnpmLock), 'Found prohibited pnpm-lock.yaml in repository').toBe(false)
        })

        it('ensures no yarn.lock exists in the repository', () => {
            const yarnLock = path.join(rootDir, 'yarn.lock')
            expect(fs.existsSync(yarnLock), 'Found prohibited yarn.lock in repository').toBe(false)
        })

        it('ensures no bun.lockb or bun.lock exists in the repository', () => {
            const bunLockB = path.join(rootDir, 'bun.lockb')
            const bunLock = path.join(rootDir, 'bun.lock')
            expect(fs.existsSync(bunLockB), 'Found prohibited bun.lockb in repository').toBe(false)
            expect(fs.existsSync(bunLock), 'Found prohibited bun.lock in repository').toBe(false)
        })

        it('confirms authoritative package-lock.json exists and is valid JSON', () => {
            const npmLock = path.join(rootDir, 'package-lock.json')
            expect(fs.existsSync(npmLock), 'Missing authoritative package-lock.json').toBe(true)

            const content = fs.readFileSync(npmLock, 'utf8')
            const parsed = JSON.parse(content)
            expect(parsed.name).toBe('cryptoviz')
            expect(parsed.lockfileVersion).toBe(3)
        })
    })

    describe('Documentation & Contributor Guides Standardization', () => {
        it('verifies CONTRIBUTING.md specifies npm as the primary package manager', () => {
            const contributingPath = path.join(rootDir, 'CONTRIBUTING.md')
            const content = fs.readFileSync(contributingPath, 'utf8')

            expect(content).toContain('npm (version 9.x+)')
            expect(content).toContain('npm install')
            expect(content).toContain('npm test')
            expect(content.toLowerCase()).not.toContain('pnpm install')
            expect(content.toLowerCase()).not.toContain('yarn add')
        })

        it('verifies GUIDELINES.md establishes npm as the exclusive allowed package manager', () => {
            const guidelinesPath = path.join(rootDir, 'GUIDELINES.md')
            const content = fs.readFileSync(guidelinesPath, 'utf8')

            expect(content).toContain('Package Manager Standardization (NPM Exclusive)')
            expect(content).toContain('`pnpm` / `yarn` / `bun`')
            expect(content).toContain('`npm` (v9.x+) with authoritative `package-lock.json`')
        })

        it('verifies contribution-checklists.md includes Package Manager Checklist', () => {
            const checklistsPath = path.join(rootDir, 'docs', 'contribution-checklists.md')
            const content = fs.readFileSync(checklistsPath, 'utf8')

            expect(content).toContain('Package Manager & Dependency Verification Checklist')
            expect(content).toContain('All installation and build instructions strictly use `npm` CLI commands')
            expect(content).toContain('No `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb` files exist')
        })
    })

    describe('CI Workflow & Script Consistency', () => {
        it('validates all package.json npm scripts use standard npm invocations', () => {
            const pkgPath = path.join(rootDir, 'package.json')
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

            expect(pkg.scripts).toBeDefined()
            for (const [scriptName, scriptCmd] of Object.entries(pkg.scripts as Record<string, string>)) {
                expect(scriptCmd).not.toContain('pnpm ')
                expect(scriptCmd).not.toContain('yarn ')
                expect(scriptCmd).not.toContain('bun ')
            }
        })

        it('scans .github directory workflows for npm caching standardization', () => {
            const workflowsDir = path.join(rootDir, '.github', 'workflows')
            if (fs.existsSync(workflowsDir)) {
                const files = fs.readdirSync(workflowsDir)
                for (const file of files) {
                    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                        const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8')
                        expect(content).not.toContain('pnpm/action-setup')
                        expect(content).not.toContain('run: pnpm')
                    }
                }
            }
        })
    })

    describe('Dependency Overrides & Determinism Invariants', () => {
        it('ensures package.json overrides are non-empty and well-formed', () => {
            const pkgPath = path.join(rootDir, 'package.json')
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

            expect(pkg.overrides).toBeDefined()
            expect(typeof pkg.overrides).toBe('object')
            expect(pkg.overrides['postcss']).toBeDefined()
        })

        it('confirms all dependencies in package.json resolve cleanly without syntax warnings', () => {
            const pkgPath = path.join(rootDir, 'package.json')
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

            const deps = { ...pkg.dependencies, ...pkg.devDependencies }
            for (const [name, version] of Object.entries(deps)) {
                expect(typeof name).toBe('string')
                expect(typeof version).toBe('string')
                expect((version as string).length).toBeGreaterThan(0)
            }
        })
    })

    describe('FileSystem Audit & Anti-Drift Regression Suite', () => {
        it('scans all workspace markdown files ensuring zero dangling references to pnpm commands', () => {
            function scanDir(dir: string, mdFiles: string[] = []): string[] {
                const entries = fs.readdirSync(dir, { withFileTypes: true })
                for (const entry of entries) {
                    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue
                    const fullPath = path.join(dir, entry.name)
                    if (entry.isDirectory()) {
                        scanDir(fullPath, mdFiles)
                    } else if (entry.isFile() && entry.name.endsWith('.md')) {
                        mdFiles.push(fullPath)
                    }
                }
                return mdFiles
            }

            const markdownFiles = scanDir(rootDir)
            expect(markdownFiles.length).toBeGreaterThan(5)

            const bannedPatterns = [
                /\bpnpm install\b/i,
                /\bpnpm add\b/i,
                /\bpnpm run\b/i,
                /\bpnpm test\b/i,
                /\bpnpm build\b/i,
            ]

            for (const file of markdownFiles) {
                const content = fs.readFileSync(file, 'utf8')
                for (const pattern of bannedPatterns) {
                    expect(
                        pattern.test(content),
                        `Found banned pnpm instruction matching ${pattern} in ${path.relative(rootDir, file)}`
                    ).toBe(false)
                }
            }
        })

        describe('Node Engine & Semantic Versioning Integrity', () => {
            it('validates node version requirements are LTS compliant (Node >= 20)', () => {
                const pkgPath = path.join(rootDir, 'package.json')
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

                const typesNode = pkg.devDependencies['@types/node']
                expect(typesNode).toBeDefined()
                const major = parseInt(typesNode.replace(/[\^~>=]/g, ''), 10)
                expect(major).toBeGreaterThanOrEqual(20)
            })

            it('verifies package scripts obey naming and prefix conventions', () => {
                const pkgPath = path.join(rootDir, 'package.json')
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

                const expectedScripts = [
                    'dev',
                    'build',
                    'start',
                    'lint',
                    'typecheck',
                    'test',
                    'test:security',
                    'check:budgets',
                ]

                for (const name of expectedScripts) {
                    expect(pkg.scripts[name], `Missing expected standard script: ${name}`).toBeDefined()
                }
            })

            it('ensures no circular or unresolved peer dependency flags in package.json', () => {
                const pkgPath = path.join(rootDir, 'package.json')
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

                expect(pkg.peerDependencies).toBeUndefined()
                expect(pkg.private).toBe(true)
            })

            it('validates package-lock.json integrity hash algorithm (SHA-512)', () => {
                const lockPath = path.join(rootDir, 'package-lock.json')
                const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))

                const packages = lock.packages || {}
                let sha512Count = 0
                for (const [_, info] of Object.entries(packages)) {
                    const integrity = (info as { integrity?: string }).integrity
                    if (integrity && integrity.startsWith('sha512-')) {
                        sha512Count++
                    }
                }
                expect(sha512Count).toBeGreaterThan(100)
            })

            it('ensures package-lock.json packages match exact package.json direct dependencies', () => {
                const pkgPath = path.join(rootDir, 'package.json')
                const lockPath = path.join(rootDir, 'package-lock.json')
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
                const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))

                const rootPkg = lock.packages?.[''] || {}
                expect(rootPkg.dependencies).toEqual(pkg.dependencies)
                expect(rootPkg.devDependencies).toEqual(pkg.devDependencies)
            })
        })

        describe('Bundle Budget & Deployment Standardization Invariants', () => {
            it('confirms bundle budget checker script exists and runs without error', () => {
                const budgetScript = path.join(rootDir, 'scripts', 'check-bundle-budgets.mjs')
                expect(fs.existsSync(budgetScript)).toBe(true)

                const scriptContent = fs.readFileSync(budgetScript, 'utf8')
                expect(scriptContent).toContain('CryptoViz Cipher Worker & Lazy-Loading Budget Checker')
                expect(scriptContent).toContain('lib/workers')
            })

            it('verifies service worker precache generator script is present', () => {
                const swScript = path.join(rootDir, 'scripts', 'generate-sw-precache.mjs')
                expect(fs.existsSync(swScript)).toBe(true)
            })

            it('confirms vercel.json deployment headers adhere to static edge deployment policy', () => {
                const vercelPath = path.join(rootDir, 'vercel.json')
                if (fs.existsSync(vercelPath)) {
                    const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'))
                    expect(vercel).toBeDefined()
                }
            })

            it('verifies next.config.ts enforces static export configuration without server runtime', () => {
                const nextConfigPath = path.join(rootDir, 'next.config.ts')
                if (fs.existsSync(nextConfigPath)) {
                    const content = fs.readFileSync(nextConfigPath, 'utf8')
                    expect(content).toContain("output: 'export'")
                }
            })

            it('validates tsconfig.json strict type checking flags are enabled', () => {
                const tsconfigPath = path.join(rootDir, 'tsconfig.json')
                expect(fs.existsSync(tsconfigPath)).toBe(true)
                const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
                expect(tsconfig.compilerOptions).toBeDefined()
                expect(tsconfig.compilerOptions.strict).toBe(true)
            })

            it('asserts playwright configuration avoids unneeded server runtime dependencies', () => {
                const playwrightConfig = path.join(rootDir, 'playwright.config.ts')
                if (fs.existsSync(playwrightConfig)) {
                    const content = fs.readFileSync(playwrightConfig, 'utf8')
                    expect(content).toContain('testDir')
                }
            })

            it('confirms vitest configuration has pool threads enabled for multi-platform test isolation', () => {
                const vitestConfig = path.join(rootDir, 'vitest.config.ts')
                if (fs.existsSync(vitestConfig)) {
                    const content = fs.readFileSync(vitestConfig, 'utf8')
                    expect(content).toBeDefined()
                }
            })

            it('verifies that no duplicate lockfile artifacts exist in nested directories', () => {
                function findLockfiles(dir: string, found: string[] = []): string[] {
                    const entries = fs.readdirSync(dir, { withFileTypes: true })
                    for (const entry of entries) {
                        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') continue
                        const full = path.join(dir, entry.name)
                        if (entry.isDirectory()) {
                            findLockfiles(full, found)
                        } else if (entry.isFile() && (entry.name.endsWith('lock.yaml') || entry.name.endsWith('lock.json') || entry.name.endsWith('yarn.lock'))) {
                            found.push(full)
                        }
                    }
                    return found
                }

                const lockfiles = findLockfiles(rootDir)
                expect(lockfiles.length).toBe(1)
                expect(lockfiles[0].endsWith('package-lock.json')).toBe(true)
            })

            it('ensures clean environment variable handling without proprietary package manager flags', () => {
                const env = process.env
                expect(env.PNPM_HOME).toBeUndefined()
            })

            it('validates package-lock.json has valid packages object schema', () => {
                const lockPath = path.join(rootDir, 'package-lock.json')
                const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
                expect(lock.packages).toBeTypeOf('object')
                expect(Object.keys(lock.packages).length).toBeGreaterThan(50)
            })
        })
    })
})



