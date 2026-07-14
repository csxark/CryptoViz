<!-- GUIDELINES.md -->
# Architecture & Coding Guidelines

This document defines all technical constraints, interfaces, coding conventions, and architectural budgets that apply to every contribution in the CryptoViz codebase. [README.md](./README.md) remains the primary developer reference; this document is the contributor-facing engineering specification.

---

## 🏛️ Architectural Non-Negotiables

| Rule | Rationale | Violation Consequence |
| :--- | :--- | :--- |
| **`output: 'export'`** | Enables fully static build files hosted on Vercel Edge CDN with zero server runtime overhead. | Next.js compilation failure on deploy; PR is automatically rejected. |
| **No runtime `fetch()`** | All API data calls must resolve at build time. Runtime queries to third-party endpoints break static guarantees. | Blocked by browser Content Security Policy (CSP); runtime error. |
| **Worker-isolated math** | Heavily taxing cryptographic equations must execute inside a background Web Worker thread. | Main UI thread locks up, causing browser frame rate drop; PR is rejected. |
| **No Unsafe JavaScript** | `eval()`, `new Function()`, `innerHTML`, and `dangerouslySetInnerHTML` create Cross-Site Scripting (XSS) vectors. | Static analysis security scans fail; immediate PR rejection. |
| **Strict TypeScript** | Catch compiler errors early to avoid runtime calculation and parity mismatches. | TypeScript typecheck CI job fails; build block. |
| **Automated `axe-core`** | Ensures code remains usable by people using assistive technologies. | Accessibility check job fails; PR blocked. |
| **CSP Script Nonces** | Prevents execution of injected inline script attacks. | Security header checks fail at deployment. |

---

## 🔐 Cipher Module Contract

Every cryptographic module under `lib/cipher/[category]/[cipher].ts` must implement and export the following typescript types:

### Type Definitions

```typescript
export type CipherErrorCode = 
  | 'INPUT_REQUIRED' 
  | 'INPUT_TOO_LONG' 
  | 'INVALID_KEY' 
  | 'INVALID_PADDING' 
  | 'ALGORITHM_UNSUPPORTED' 
  | 'WORKER_TIMEOUT';

export class CipherError extends Error {
  constructor(public code: CipherErrorCode, message: string) {
    super(message);
    this.name = 'CipherError';
  }
}

export interface CipherStep {
  index: number;
  label: string;
  inputState: string;
  outputState: string;
  highlight?: number[];
  note?: string;
  matrix?: string[][] | string;
  table?: { key: string; value: string }[];
  isMilestone?: boolean;
}

export interface CipherMetadata {
  name: string;
  securityStatus: 'secure' | 'legacy' | 'deprecated' | 'broken';
  yearDesigned?: number;
  standardBody?: string;
  breakingComplexity?: string;
}

export interface CipherResult {
  output: string;
  outputEncoding?: 'utf8' | 'hex' | 'base64';
  steps: CipherStep[];
  metadata: CipherMetadata;
  durationMs: number;
}

export interface CipherOptions {
  instrument?: boolean;
  encoding?: 'utf8' | 'hex' | 'base64';
  mode?: 'demo' | 'real';
  [key: string]: any;
}
```

### Function Signatures

Every module must export pure encrypt/decrypt methods and standard test vectors:

```typescript
export function encrypt(input: string, key: string, options?: CipherOptions): CipherResult;
export function decrypt(input: string, key: string, options?: CipherOptions): CipherResult;

export const TEST_VECTORS: Array<{
  input: string;
  key: string;
  expected: string;
  description?: string;
}>;
```

### Execution Paths: Fast vs. Instrumented
To optimize worker performance, modules must branch based on the `options.instrument` flag:
- `instrument === true`: Runs the instrumented code path, populating detailed intermediate round states into the `steps[]` array.
- `instrument === false` (or undefined): Runs the high-performance path, returning the final output quickly with an empty `steps` array.

### Input Validation Rules

| Condition | Error Code | Message Format |
| :--- | :--- | :--- |
| Input is `undefined`, `null`, or `""` | `INPUT_REQUIRED` | `"Input message is required."` |
| Input byte size exceeds 4096 bytes | `INPUT_TOO_LONG` | `"Input exceeds maximum allowed size of 4096 bytes."` |
| Key matches incorrect length/format | `INVALID_KEY` | `"Invalid key format: [specific reason]"` |

### Step Count Budgets

To prevent browser memory exhaustion during animation, the `steps[]` trace array must adhere to the following budgets:

| Cipher Category | Mode / Input Size | Maximum Step Limit |
| :--- | :--- | :--- |
| **Classical** | Full trace (Input < 100 chars) | 1 step per char / block |
| **Classical** | Summary trace (Input >= 100 chars) | Max 50 steps total |
| **Symmetric (DES/AES)** | Hex Input (all sizes) | 1 step per round + final block |
| **Hash (SHA-2/MD5)** | Short inputs | 1 step per compression round |
| **Asymmetric (RSA)** | Demo mode | Max 30 exponentiation steps |

### Performance Targets
- **Fast Path latency**: < 5ms for block ciphers on 1 KB payloads.
- **Instrumented Path latency**: < 100ms for full round details.

---

## ⚙️ Worker Message Protocol

All computations run off-thread via `lib/workers/cipher.worker.ts`.

### Communication Interfaces

```typescript
interface WorkerRequest {
  id: string; // Unique nanoid
  action: 'encrypt' | 'decrypt';
  cipherId: string;
  input: string;
  key: string;
  options?: CipherOptions;
}

interface WorkerResponse {
  id: string;
  success: boolean;
  result?: CipherResult;
  error?: string;
}
```

### The `useCipherWorker()` Hook Contract
- Manages Web Worker thread initialization and cleanup on component unmount.
- Tracks active requests in a `Map` keyed by `id` to resolve promises asynchronously.
- Enforces a **10-second timeout** budget; if exceeded, the worker is terminated and a `WORKER_TIMEOUT` error is raised.

### Worker Isolation Rules
Cipher engines run inside the Worker's isolated global context. They **must not** access DOM variables:
- No `window` or `document` calls.
- No `localStorage` or `sessionStorage` usage.
- No network `fetch()` or `XMLHttpRequest` requests.
- No imports of server-only node libraries.

---

## 🎨 Design System & Styling Rules

All styling uses Tailwind CSS v4 utility classes and CSS custom properties defined in `app/globals.css`.

| Rule Category | Correct Approach | Incorrect Approach |
| :--- | :--- | :--- |
| **Class Merging** | `className={cn('text-sm', isActive && 'text-teal-600')}` | `className={'text-sm ' + (isActive ? 'text-teal-600' : '')}` |
| **Color System** | `bg-card`, `text-foreground`, `border-border` | `bg-[#ffffff]`, `text-[#1a1a1a]`, `border-zinc-200` |
| **Theme Support** | `dark:bg-zinc-900 bg-white` | Hardcoding single-theme background configurations |
| **Animations** | `motion` wrappers for layout transitions | Arbitrary GSAP scripts or complex CSS transitions |
| **Arbitrary Values** | `w-[32rem] /* Sidebar wide bounds */` | `w-[512px]` (no explaining comments) |
| **Font Settings** | `font-mono` for keys, binary, and hex maps | `font-sans` for raw hexadecimal lists |
| **CSS Assets** | Define styles inside components via Tailwind | Creating separate `.css` modules per folder |

---

## 🧪 Testing Requirements

### 1. Unit Tests (Vitest)
- **Coverage Gate**: 80% line coverage threshold on `lib/cipher/**`.
- **Properties Checked**: known-answer vectors, empty input, size limits, and invalid keys.
- **Fuzzing (fast-check)**:
  - Symmetric ciphers: 500 iterations of round-trip encryption/decryption.
  - Classical ciphers: 1000 iterations of random inputs to verify no engine crashes occur.
- **Test File Location**: `tests/unit/[category]/[cipher].test.ts`.

### 2. E2E Tests (Playwright)
- **Environments**: Verified on Chromium and Firefox.
- **Required Core Paths**: Visualizing a cipher step-by-step, parsing an MDX document, and applying filters to resources.
- **Timing Safety**: Avoid `page.waitForTimeout()`. Always assert visibility using locator states.
- **Security Auditing**: Inject XSS payloads (e.g. `<script>alert(1)</script>`) into inputs and verify they render safely as sanitized text rather than executing. Verify security headers in `vercel.json` are returned by checking HTTP responses.

### 3. Accessibility Tests (axe-core)
- **Compliance Gate**: Zero violations allowed for `critical` and `serious` impact levels.
- **Log Output**: Save `moderate` and `minor` warnings into `tests/a11y/violations-log.json`.

---

## 🛡️ Security Hardening Checklist

| Security Check | How to Verify | CI Gate Status |
| :--- | :--- | :--- |
| **Sanitize Outputs** | Render all dynamic values (cipher output, step notes, user input) as React text nodes so JSX escapes them automatically. Never pass dynamic content to `dangerouslySetInnerHTML`. | Fail review if dynamic content is rendered as raw HTML. |
| **Key Clearance** | Ensure sensitive keys are cleared on component unmount. | Validated in manual code review. |
| **No Unsafe Logic** | Verify zero usage of `eval`, `innerHTML`, and constructor functions. | Checked by static analysis rules. |
| **CSP Compliance** | Verify `worker-src blob:` and security nonces in `vercel.json`. | Checked by E2E security tests. |
| **Dependency Scans** | Run dependency auditing to check for known CVEs. | `pnpm audit` runs on pull requests. |
| **Secure Input Limits** | Ensure input size is restricted to a maximum of 4096 bytes. | Validated in unit test suite. |

---

## ⏱️ Performance Budgets

| Metric | Budget | Fail Threshold | How Measured |
| :--- | :--- | :--- | :--- |
| **Main JS Bundle** | < 120 KB gzipped | > 150 KB gzipped | `pnpm analyze` |
| **LCP (Largest Contentful Paint)** | < 1.2s | > 2.5s | Playwright Core Web Vitals |
| **CLS (Cumulative Layout Shift)**| < 0.05 | > 0.1 | Playwright Core Web Vitals |
| **INP (Interaction to Next Paint)**| < 100ms | > 200ms | Playwright Core Web Vitals |
| **Lighthouse Performance** | ≥ 90 | < 80 | Lighthouse CI Action |
| **Lighthouse Accessibility** | ≥ 95 | < 90 | Lighthouse CI Action |

---

## 📦 Dependency Policy

### Allowed Registry

| Category | Package | Reason / Purpose |
| :--- | :--- | :--- |
| **Crypto** | `@noble/hashes` | Secure, audited SHA-2, MD5, and HMAC implementations. |
| **Crypto** | `@noble/curves` | Highly optimized Elliptic Curve P-256 signatures. |
| **UI** | `@radix-ui/*` | Unstyled accessible base controls. |
| **Animation** | `motion` | React transitions and step animations. |

### Banned Registry

| Banned Package | Banned Reason | Allowed Alternative |
| :--- | :--- | :--- |
| `crypto-js` | Legacy, unaudited, slow performance | `@noble/hashes` / WebCrypto |
| `forge` | Bulky size, unmaintained | WebCrypto |
| `gsap` | Heavy bundle size, license restrictions | `motion` (Framer) |
| `jest` | Slow startup, configuration overhead | `vitest` |
| `@mui/material` | Heavy CSS footprint, style override difficulties | Tailwind CSS v4 + Radix UI |
| `contentlayer` | Unmaintained project | `next-mdx-remote` |
| `algolia` | Requires a server runtime | `pagefind` (WASM) |

---

## ♿ Accessibility (a11y) Requirements

- **Compliance standard**: WCAG 2.1 AA.
- **`ByteHeatmap` Requirements**: Every cell in the byte grid must contain an accessible label:
  `aria-label="Byte ${index}: ${hex} (${changed ? 'changed' : 'unchanged'})"`
- **`StepAnimator` Requirements**: Play/pause buttons need dynamic ARIA labels. The scrub slider must set `aria-valuemin="0"`, `aria-valuemax="${steps.length - 1}"`, and `aria-valuenow="${currentStep}"`.
- **`PlayfairGrid` Requirements**: Highlighted cells must set `aria-selected="true"`.
- **Keyboard Navigation**: Users must be able to focus and navigate all grids using `Tab` and arrow keys.
- **Motion Reduction**: If `prefers-reduced-motion` is active, the `StepAnimator` must disable transitions and display states immediately.
- **Focus Management**: Focus must move to the output container once calculations finish.

---

## 📄 MDX Content Rules

- **Frontmatter Validation**: Checked via Zod schemas at build time.
- **Dynamic Links**: Link ciphers using backticks (e.g. `` `[caesar]` ``), which are parsed and styled by `rehype-cipher-link`.
- **Callout Containers**: Standardized syntax for warnings and notes:
  ```markdown
  > [!NOTE]
  > This is a note callout.
  ```
- **Depth**: Markdown headings inside MDX should start at `h2` (`##`). The `h1` heading is generated automatically from the frontmatter title.
- **Static Assets**: All image files must be saved in the `/public` path and specify descriptive `alt` text. External image hosting is prohibited.
- **Language Tags**: Code fences must specify language tags. Use `ts` instead of `typescript` for brevity.

---

## 🗃️ Resource Registry Rules

Every resource object added to `content/resources.ts` must match the `Resource` interface:

```typescript
export interface Resource {
  id: string;
  title: string;
  url: string;
  source: string;
  description: string;
  tags: ResourceTag[];
  readingTime: number;
  type: 'article' | 'paper' | 'tool' | 'video' | 'course';
  addedAt: string;
}
```

### Quality Guidelines
- **URLs**: Must use the `https://` protocol.
- **Freshness**: Content should be published within the last 3 years, except for seminal papers.
- **Access**: Note paywalled content explicitly.
- **Authority**: Prefer primary sources (NIST specifications, RFC drafts) over third-party summaries.

---

## 🔄 Commit & Branch Conventions

### Commit Types

| Type | When to use |
| :--- | :--- |
| **`feat`** | Adding new features or ciphers. |
| **`fix`** | Resolving bugs or compilation failures. |
| **`docs`** | Writing MDX files or system documentation. |
| **`style`** | Adjusting CSS, layouts, or animations. |
| **`refactor`** | Restructuring code without changing behavior. |
| **`test`** | Writing unit or E2E tests. |
| **`security`** | Adjusting CSP policies or patching vulnerabilities. |
| **`chore`** | Updating configuration files or dependencies. |

### Commit Scopes

| Scope | Directories / Files Covered |
| :--- | :--- |
| **`cipher`** | `lib/cipher/` engines. |
| **`docs`** | `content/docs/` and `app/(docs)/`. |
| **`resources`** | `content/resources.ts` and `app/(resources)/`. |
| **`ui`** | `components/` and style utilities. |
| **`worker`** | `lib/workers/` thread files. |
| **`ci`** | `.github/workflows/` YAML actions. |
| **`config`** | Config files (`tsconfig.json`, `next.config.ts`). |

### Branch Naming Patterns

| Contribution Type | Branch Prefix | Example Branch Name |
| :--- | :--- | :--- |
| **Features** | `feat/` | `feat/cipher-atbash` |
| **Bug Fixes** | `fix/` | `fix/worker-timeout` |
| **Documentation**| `docs/` | `docs/tls-handshake` |
| **Housekeeping** | `chore/` | `chore/update-deps` |

---

## 🔄 Implementation Priority Order

When reviewing open pull requests, maintainers resolve merge conflicts in this order:

1. **Security Fixes**: Addressing security issues (any severity). Ensures user security.
2. **Build-breaking Bugs**: Resolving compilation or export failures. Keeps the build system stable.
3. **Cipher Correctness**: Fixing incorrect engine calculations. Ensures accurate educational outputs.
4. **Accessibility Violations**: Resolving critical or serious accessibility violations. Maintains usability for all.
5. **Performance Regressions**: Fixing core web vital or bundle size regressions. Ensures fast page loads.
6. **New Cipher Implementations**: Onboarding new visualizer ciphers. Expands platform features.
7. **New MDX Content**: Onboarding new educational articles. Expands platform content.
8. **UI Polish**: Applying cosmetic layout adjustments. Improves user experience.
9. **New Resource Entries**: Onboarding external reference links. Expands learning resources.
