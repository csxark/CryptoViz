<!-- CONTRIBUTING.md -->
# Contributing to CryptoViz

Welcome to CryptoViz! We are excited that you are interested in contributing. Cryptography can feel like a highly specialized and intimidating domain, but our mission is to make it accessible to everyone. Whether you are a security researcher, a computer science student, or a web developer looking to improve your React skills, your contributions are welcome here.

By contributing to this repository, you help build a resource that visualizes complex security concepts in a clear, educational, and accessible manner. Please take a moment to read this document to understand our contribution processes, coding protocols, and pull request rules.

All contributors are expected to adhere to our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## 🔍 Before You Start

### Prerequisites
To contribute code, you should have a solid foundation in the following:
- **Node.js**: Version 22.x LTS (pinned target)
- **Package Manager**: npm (version 9.x+)
- **Version Control**: Git
- **Language**: TypeScript (strict type check enabled)
- Familiarity with basic cryptographic principles is highly recommended. Please review the [CIPHER_ENGINE.md](./CIPHER_ENGINE.md) document to study the mathematical equations and parameters of each algorithm.

### Read-First Checklist
Before writing any code, please complete the following steps:

1. Read [README.md](./README.md) for project clearity and ide on what you are building and what we plan to build in the future.

2. Read [Guidelines.md](./GUIDELINES.md) to understand the coding standards, rules, and guidelines we follow.

3. Read [docs/contribution-checklists.md](./docs/contribution-checklists.md) and complete the checklist matching your contribution type (new cipher, new visualizer, or security-sensitive feature) before opening a PR.

4. If your contribution involves reduced parameters, mocked peers, or synthetic data of any kind, read [docs/simulation-vs-live-data-policy.md](./docs/simulation-vs-live-data-policy.md). Contributors are prohibited from describing simulated operations as verified operations, in code, UI copy, or PR descriptions.

---

## 💻 Local Development Setup

Follow these steps to set up your local development environment:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/csxark/CryptoViz.git
   cd cryptoviz
   ```

2. **Install node dependencies**:
   ```bash
   npm install
   ```

3. **Verify your local installation**:
   Run the unit tests to ensure your starting environment is correct:
   ```bash
   npm test
   ```
   Verify that the static export build succeeds:
   ```bash
   npm build
   ```

4. **Start the development server**:
   ```bash
   npm dev
   ```

Open `http://localhost:3000` in your browser. You are ready to start coding.

---

## 🌿 Development Workflow

We follow a strict Test-Driven Development (TDD) cycle for cipher implementations:

1. **Branch Naming**:
   Create a new branch from `main`. Use descriptive prefixes for branch names:
   - Features: `feat/cipher-playfair`
   - Bug fixes: `fix/worker-timeout`
   - Documentation: `docs/tls-handshake`
   - Housekeeping: `chore/update-deps`

2. **Write Tests First (TDD)**:
   You must write your unit tests and register test vectors in a test file *before* writing the implementation code.
   - Test files belong in `tests/unit/[category]/[cipher].test.ts`.
   - Your test file must exist and fail in CI before implementation code can be merged.

3. **Implement Feature**:
   Write code in the appropriate directories. Ensure no main-thread blocks are introduced.

4. **Verify Quality Gates**:
   Run the formatting, typechecking, and testing scripts locally:
   ```bash
   npm lint
   npm typecheck
   npm test
   npm build
   ```

5. **Submit Pull Request**:
   Open a PR against the `main` branch. Ensure the PR title conforms to the commit message convention.

---

## 🔒 How to Add a New Cipher

Follow this step-by-step guide to add a new cryptographic algorithm to the visualizer engine:

### Step 1: Research and Foundations
Read the corresponding section in [CIPHER_ENGINE.md](./CIPHER_ENGINE.md). Learn the key structure, block transformations, and step tracing schemas required for visual execution.
> **Note:** If you are implementing a classical cipher that is cryptographically broken (e.g. Beaufort or Playfair), it is considered educational content. You must implement it with `securityStatus: 'broken'` in its metadata and provide a brief explanation of how it is broken.

### Step 2: Create the Test Suite
Before writing any cipher logic, create its test file at `tests/unit/[category]/[cipher].test.ts`.
Add tests for:
- Standard NIST/RFC known-answer test vectors.
- Empty input handling (must throw `INPUT_REQUIRED`).
- Maximum input length validation (must throw `INPUT_TOO_LONG` for inputs > 4096 bytes).
- Key validation (must throw `INVALID_KEY` for wrong sizes or invalid character formats).

### Step 3: Implement the Cipher Engine
Create your implementation at `lib/cipher/[category]/[cipher].ts`.
- **Contract**: The file must export `encrypt`, `decrypt`, and `TEST_VECTORS`.
- **Dual Execution Paths**: You must write two code paths:
  1. `encryptFast` / `decryptFast`: High-performance execution that returns the output immediately without generating intermediate trace steps.
  2. `encryptInstrumented` / `decryptInstrumented`: Trace execution that records each mathematical step state in a `steps[]` array for the UI animator.
- **Errors**: Always throw a typed `CipherError` (imported from `lib/utils/errors.ts`) with appropriate error codes. Never throw raw strings.

### Step 4: Register the Cipher ID
Add your new cipher metadata and configuration options to `lib/cipher/registry.ts`. Register its string identifier in the list of supported types.

### Step 5: Update the Web Worker Router
Open `lib/workers/cipher.worker.ts` and add a dynamic import loader entry for your new cipher in `cipherLoaders` (e.g. `'my-cipher': () => import('../cipher/category/my-cipher')`).
> **Note:** Although classical ciphers run fast, they must be routed through the Web Worker via `useCipherWorker()` to maintain architectural consistency and keep the main UI thread clean.

### Step 6: Configure Static Page Pre-rendering
Open `app/visualizer/[cipher]/page.tsx` and ensure that your new cipher slug is returned by `generateStaticParams()` to allow Next.js to pre-render the page at build time.

### Step 7: Add Visualizer Component (if applicable)
If your cipher requires custom visualization beyond the standard step-by-step display, create a visualizer component following the patterns in [docs/visualizer-development-guide.md](./docs/visualizer-development-guide.md). The guide provides:
- Standard component props and interfaces
- Rendering conventions for matrices, highlights, and tables
- Styling guidelines with Tailwind v4 tokens
- Accessibility requirements and ARIA attributes
- A complete template component at `components/visualizers/TemplateVisualizer.tsx`

### Step 8: Run Final Verification
Verify your implementation passes all compilation check gates:
```bash
npm lint && npm typecheck && npm test && npm build
```

### Step 9: Verify Performance Budgets
Verify that your cipher steps do not exceed the step budgets mapped in `GUIDELINES.md` (e.g., summary-mode limit for long inputs).

### Cipher PR Checklist
- [ ] NIST/RFC test vectors pass in `vitest`.
- [ ] Both `fast` and `instrumented` execution paths are implemented.
- [ ] Input size validation throws `INPUT_TOO_LONG` above 4096 bytes.
- [ ] Invalid key patterns throw `INVALID_KEY` with a descriptive message.
- [ ] No DOM APIs (`window`, `document`, `localStorage`) are used in the cipher module.
- [ ] The cipher is registered in the Web Worker routing switch.
- [ ] The cipher slug is configured in the static export `generateStaticParams`.
- [ ] Custom visualizer (if applicable) follows the [visualizer development guide](./docs/visualizer-development-guide.md).
- [ ] Bundle size change is measured and noted in the PR description.

---

## 📝 How to Add a New Doc

Our documentation articles are written in MDX and compiled at build time.

### Step 1: Create the Document File
Create a new file inside `content/docs/[slug].mdx`. The file name will dictate the URL slug of the article.

### Step 2: Define required frontmatter
Every MDX document must start with a YAML frontmatter block that matches this schema:
```yaml
---
title: "Understanding AES Key Schedules" # Max 60 characters
description: "A deep dive into how AES expands a 128-bit key into round keys." # Max 160 characters
difficulty: intermediate # beginner | intermediate | advanced
readingTime: 8 # Calculated at ~200 words per minute
tags: ["symmetric", "aes", "keys"] # Max 5 tags
prerequisites: ["what-is-a-block-cipher"] # Slugs of other docs
publishedAt: 2026-06-12
updatedAt: 2026-06-12
---
```

### Step 3: Write Article Content
- Ensure your technical claims are accurate and cross-referenced with standards (NIST, RFC).
- To link to a cipher visualizer, use the custom link syntax: `` `[aes]` `` which renders as a visualizer badge link.
- Use GitHub-style callouts for highlights:
  ```markdown
  > [!NOTE]
  > This is a note callout.
  ```

### Step 4: Validate and Compile
Run `pnpm build`. The frontmatter is validated via Zod schemas at build time. Any missing or malformed fields will trigger a build compilation failure.

### Docs PR Checklist
- [ ] Frontmatter block is complete and conforms to the Zod schema.
- [ ] No broken internal links are present.
- [ ] Target ciphers are referenced using the `` `[slug]` `` syntax.
- [ ] Reading time matches the word count (~200 words/minute).
- [ ] `updatedAt` field is set to today's date (ISO 8601).

---

## 🔗 How to Add a Resource

External links are stored in a statically-typed registry.

### Step 1: Append Registry
Open `content/resources.ts` and add a new entry to the array.

### Step 2: Conform to TypeScript Interface
The resource object must conform to this interface structure:
```typescript
interface Resource {
  id: string              // Unique kebab-case identifier
  title: string           // Max 80 characters
  url: string             // Must begin with HTTPS://
  source: string          // Name of publication or platform
  description: string     // Max 200 characters
  tags: ResourceTag[]     // Valid tag category array
  readingTime: number     // Estimated read duration in minutes
  type: 'article' | 'paper' | 'tool' | 'video' | 'course'
  addedAt: string         // YYYY-MM-DD
}
```

### Step 3: Quality Guidelines
- **HTTPS Only**: Plaintext HTTP URLs are rejected.
- **Freshness**: Content should be published within the last 3 years, except for seminal academic papers.
- **Accessibility**: No paywalled content unless explicitly noted in the description.
- **Source Authority**: Prefer primary specifications (NIST, IETF) and reputable research platforms.

### Resource PR Checklist
- [ ] Entry matches the TypeScript interface.
- [ ] URL is valid and accessible.
- [ ] `addedAt` timestamp matches today's date in YYYY-MM-DD format.
- [ ] No duplicate URLs exist in `content/resources.ts`.

---

## 📥 Pull Request Process

- **Branch Protection**: All pull requests must pass the required GitHub Actions check `CI Quality Gates / Merge Gate` before they can be merged. That gate aggregates typecheck, lint, unit tests, security tests, accessibility tests, production build, and the bundle budget check.
- **Squash Merge**: All PRs are squash-merged into `main`. The final commit message will be set to the PR title.
- **Review SLA**: Maintainers aim to review pull requests within 5 business days.
- **PR Description Template**:
  ```markdown
  ### Summary
  Brief summary of changes.

  ### Motivation
  Why is this change necessary?

  ### Changes
  List of key modifications.

  ### Test Plan
  Steps to verify your changes.

  ### Screenshots (if applicable)
  Visual evidence.
  ```

### 🚫 Auto-Rejection Criteria
Pull requests containing any of the following will be automatically rejected:
1. **Direct Cipher Imports**: Importing a cipher directly into UI components instead of using the `useCipherWorker()` hook.
2. **Main Thread Blocking**: Running heavy computations on the main JavaScript thread.
3. **Static Export Disruptions**: Modifying configurations to remove `output: 'export'` from `next.config.ts`.
4. **Banned Dependencies**: Attempting to add libraries listed on the banned dependency registry (e.g. `crypto-js`, `jest`, `gsap`).
5. **Code Coverage Reductions**: Reducing unit test line coverage below the 80% threshold.
6. **Strict Types Bypasses**: Using `any` types or `@ts-ignore` flags without documented justification.
7. **Unsafe JavaScript Methods**: Using `eval()`, `new Function()`, `innerHTML`, or `dangerouslySetInnerHTML`.

---

## 💬 Commit Conventions

We enforce the Conventional Commits specification. PR titles and commit messages must conform to the following schema:

`type(scope): short description`

| Type | Scope | Description / When to use |
| :--- | :--- | :--- |
| **`feat`** | `cipher` | Adding a new algorithm implementation. |
| **`fix`** | `worker` | Correcting runtime bugs in the worker interface. |
| **`docs`** | `docs` | Modifying MDX files or writing guides. |
| **`style`** | `ui` | Adjusting CSS, layouts, or animations. |
| **`refactor`**| `ui` | Restructuring files without changing features. |
| **`test`** | `config` | Writing new tests or adjusting config. |
| **`security`**| `config` | Tightening security headers or patching vulnerabilities. |
| **`chore`** | `ci` | Performing dependency updates or CI maintenance. |

### Commit Examples
- `feat(cipher): add AES-256 step-by-step matrix visualizer`
- `fix(worker): handle empty inputs before WebCrypto invocation`
- `test(cipher): add standard NIST vectors for SHA-512`
- `security(headers): configure CSP worker-src blob directive`
- `docs(content): add MDX article detailing Diffie-Hellman`
- `style(ui): update visualizer grid highlight animations`

---

## 🔄 Implementation Priority

When reviewing and merging open PRs, maintainers resolve conflicts in the following priority order:

1. **Security Fixes**: Mitigating security issues (any severity).
2. **Build-breaking Bugs**: Resolving build compile and static export failures.
3. **Cipher Correctness**: Correcting mathematical engine output mismatches.
4. **Accessibility Violations**: Fixing critical or serious WCAG accessibility violations.
5. **Performance Regressions**: Fixing bundle budget or core web vital regressions.
6. **New Cipher Implementations**: Onboarding new visualizer pages.
7. **New MDX Content**: Merging new educational documentation chapters.
8. **UI Polish**: Applying cosmetic interface updates.
9. **New Resource Entries**: Onboarding external reference links.

---

## 📞 Getting Help

- **Questions & Discussions**: Use GitHub Discussions for questions, layout proposals, or feature ideas.
- **Bug Reports**: Open a GitHub Issue for bugs, browser crashes, or spelling mistakes.
- **Security Vulnerabilities**: If you discover a security vulnerability, **do not** open a public issue. Email details privately to `arktandoncs@gmail.com` or use GitHub Private Vulnerability Reporting.
