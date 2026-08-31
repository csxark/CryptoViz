<!-- README.md -->
# CryptoViz

Interact with Cryptography, Visualized in Real-Time.

![CI Status](https://img.shields.io/github/actions/workflow/status/csxark/CryptoViz/ci.yml?branch=main&label=CI)
![License](https://img.shields.io/github/license/csxark/CryptoViz?color=blue&label=License)
![Coverage](https://img.shields.io/badge/coverage-%E2%89%A580%25-success)
![Lighthouse Performance](https://img.shields.io/badge/lighthouse--performance-%E2%89%A590-emerald)
![Lighthouse Accessibility](https://img.shields.io/badge/lighthouse--accessibility-%E2%89%A595-emerald)
![Vercel Status](https://img.shields.io/badge/deployment-Vercel-black?logo=vercel)

CryptoViz is a fully static Next.js 15 cybersecurity visualizer and cryptography learning platform. It allows developers, students, and security professionals to explore cryptographic algorithms step-by-step with off-thread calculations. The platform operates client-side inside secure browser Web Workers, rendering interactive visual trace state machines.

---
## Why CryptoViz?

- Interactive step-by-step cryptography visualizations
- Runs entirely in the browser
- No server required
- Educational and beginner-friendly
- Open source

---
## 🔗 Live Demo

Visit the production site at [Live Demo](https://crypto-viz-liart.vercel.app). Explore the interactive visualizer ciphers, read built-in cybersecurity documentation, and browse our curated learning resources list.

---

## Table of Contents

- [Why CryptoViz?](#why-cryptoviz)
- [Live Demo](#-live-demo)
- [Features](#-features)
  - [Cipher Visualizer](#1-cipher-visualizer)
  - [Docs Module](#2-docs-module)
  - [Resources Module](#3-resources-module)
- [Architecture](#architecture)
  - [High-Level Architecture Diagram](#high-level-architecture-diagram)
  - [Project Structure](#project-structure)
  - [Data Flow](#data-flow)
  - [Key Architectural Decisions](#key-architectural-decisions)
  - [SaaS Architecture (Additive Layer)](#saas-architecture-additive-layer)
- [Tech Stack](#tech-stack)
- [Browser Compatibility](#browser-compatibility)
  - [Supported Desktop Browsers](#supported-desktop-browsers)
  - [Supported Mobile Browsers](#supported-mobile-browsers)
  - [Required Browser Features](#required-browser-features)
  - [Recommended Browser Versions](#recommended-browser-versions)
  - [Unsupported or Partially Supported Browsers](#unsupported-or-partially-supported-browsers)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Step-by-Step Setup](#step-by-step-setup)
- [Commands Reference](#commands-reference)
- [Troubleshooting](#troubleshooting)
  - [`npm install` fails](#1-npm-install-fails)
  - [`npm run build` fails](#2-npm-run-build-fails)
  - [Development server does not start](#3-development-server-does-not-start)
  - [Missing `.env.local` configuration](#4-missing-envlocal-configuration)
  - [Node.js version mismatch](#5-nodejs-version-mismatch)
  - [General Debugging Tips](#general-debugging-tips)
- [Contributing](#-contributing)
  - [Constants Naming Convention](#constants-naming-convention)
- [Frequently Asked Questions (FAQ)](#-frequently-asked-questions-faq)
  - [Which Node.js version is recommended?](#which-nodejs-version-is-recommended)
  - [Does CryptoViz require a backend server?](#does-cryptoviz-require-a-backend-server)
  - [Which browsers are officially supported?](#which-browsers-are-officially-supported)
  - [Where are the cipher implementations located?](#where-are-the-cipher-implementations-located)
  - [How do I add a new cipher?](#how-do-i-add-a-new-cipher)
  - [How do I run tests before submitting a pull request?](#how-do-i-run-tests-before-submitting-a-pull-request)
  - [Where can I report bugs or request new features?](#where-can-i-report-bugs-or-request-new-features)
- [License](#-license)
- [Acknowledgements](#-acknowledgements)
- [Continuous Integration](#continuous-integration)

## ✨Features

### 1. Cipher Visualizer
CryptoViz supports step-by-step state animations, dynamic parameters, and off-thread execution inside Web Workers. Below is the list of supported ciphers:

| Cipher | Category | Security Status | Standard |
| :--- | :--- | :--- | :--- |
| **Caesar** | Classical | legacy | Shift cipher |
| **ROT13** | Classical | legacy | Fixed Caesar-13 |
| **Vigenère** | Classical | legacy | Polyalphabetic substitution |
| **Playfair** | Classical | legacy | 5x5 Matrix bigram cipher |
| **Rail Fence** | Classical | legacy | Transposition zigzag cipher |
| **Atbash** | Classical | legacy | Reversed alphabet |
| **XOR** | Symmetric | legacy | Byte-wise XOR stream |
| **OTP (One-Time Pad)** | Symmetric | secure (with caveats) | Perfect secrecy cipher |
| **DES** | Symmetric | deprecated | FIPS 46-3 (64-bit block) |
| **3DES** | Symmetric | deprecated | SP 800-67 (Triple DES) |
| **AES-128 / AES-256** | Symmetric | secure | FIPS 197 standard |
| **RSA-OAEP** | Asymmetric | secure | PKCS #1 v2.2 |
| **Diffie-Hellman (DH)** | Asymmetric | secure | RFC 7919 / FIPS 196 |
| **ECDSA P-256** | Asymmetric | secure | FIPS 186-5 (Elliptic Curve) |
| **SHA-256** | Hash | secure | FIPS 180-4 standard |
| **SHA-512** | Hash | secure | FIPS 180-4 standard |
| **MD5** | Hash | broken | RFC 1321 (Educational only) |
| **HMAC-SHA256** | Hash | secure | RFC 2104 standard |
| **Bcrypt** | Hash | secure | Blowfish-based KDF |

### 2. Docs Module
- **Interactive Markdown (MDX)**: Custom MDX rendering with LaTeX mathematical equations.
- **Auto-linking Ciphers**: Custom plugins that convert backtick tags directly into visualizer link pills.
- **Reading Time & TOC**: Interactive table of contents tracking read times.

### 3. Resources Module
- **Curated Reading**: High-quality resource registry mapping tools, books, videos, and specifications.
- **Client-side Filter**: Rapid filtering by tags, reading duration, and content types without backend requests.

---

## Architecture

### High-Level Architecture Diagram

```mermaid
graph TD
  subgraph Browser [Client Web Browser]
    MainThread[Main UI Thread: Next.js / React / Zustand]
    WorkerThread[Background Web Worker: cipher.worker.ts]
    MainThread -->|postMessage: WorkerRequest| WorkerThread
    WorkerThread -->|onmessage: WorkerResponse| MainThread
  end

  subgraph CDNElements [Build & Edge Static CDN]
    VercelCDN[Vercel CDN Static Assets]
    StaticBuild[Pagefind Static Search WASM]
  end

  subgraph SaaS [Additive SaaS Layer - Phase 9]
    EdgeFunc[Vercel Serverless/Edge Functions]
    Neon[Neon Serverless Postgres]
    Stripe[Stripe Checkout & Billing]
    Resend[Resend Transactional Email]
  end

  MainThread <-->|Fetch Static HTML/JS| VercelCDN
  MainThread <-->|Query WASM Index| StaticBuild
  MainThread <-->|HTTPS API / Auth| EdgeFunc
  EdgeFunc <-->|Drizzle ORM| Neon
  EdgeFunc <-->|Webhooks / API| Stripe
  EdgeFunc <-->|SMTP Trigger| Resend
```

### Project Structure

```
cryptoviz/
├── app/                  # Next.js App Router folders
│   ├── (visualizer)/     # Visualizer route group
│   ├── (docs)/           # MDX Docs route group
│   ├── (resources)/      # Resources filter list
│   ├── layout.tsx        # Top-level HTML and layouts
│   └── page.tsx          # Marketing home landing page
├── components/           # Reusable UI component blocks
│   ├── ui/               # Radix UI wrapper primitives
│   ├── cipher/           # Grid displays and step controls
│   ├── docs/             # Toc layout and MDX callouts
│   └── resources/        # Cards and tags search components
├── lib/                  # Underlying business engines
│   ├── cipher/           # Pure JS cryptographic implementations
│   ├── workers/          # Web worker entry file
│   ├── hooks/            # useCipherWorker & share URL managers
│   ├── store/            # Visualizer application stores
│   ├── mdx/              # MDX remark/rehype processors
│   ├── search/           # Pagefind index loaders
│   └── utils/            # CSS classes merging and sanitizers
├── content/              # Raw data files
│   ├── docs/             # MDX documents content
│   └── resources.ts      # Statically-typed resource database
├── public/               # Public assets and Pagefind WASM
├── tests/                # Verification suites
│   ├── unit/             # Vitest cipher verification
│   ├── e2e/              # Playwright browser flows
│   ├── a11y/             # axe-core accessibility checks
│   └── security/         # Security header tests
└── .github/workflows/    # CI/CD action routines
```

### Data Flow

```mermaid
sequenceDiagram
  autonumber
  actor User as User Interface
  participant Store as Zustand Store
  participant Hook as useCipherWorker()
  participant Worker as Web Worker
  participant Cipher as Cipher Module
  participant Animator as Animator Store

  User->>Store: Input text, select Key, & options
  Store->>Hook: Trigger runCipher()
  Hook->>Worker: postMessage(WorkerRequest + unique ID)
  activate Worker
  Worker->>Cipher: Call encrypt() / decrypt()
  Note over Cipher: Execute instrumented<br/>vs fast execution path
  Cipher-->>Worker: Return CipherResult + steps[]
  Worker-->>Hook: postMessage(WorkerResponse)
  deactivate Worker
  Hook->>Animator: Load steps[] and output
  Animator->>User: Render output & step-by-step state
```

1. **User input**: The user types plaintext, configures keys, and options in the visualizer UI.
2. **State dispatch**: React fields update state in the visualizer Zustand store.
3. **Worker handoff**: The `useCipherWorker()` hook captures input and creates a `WorkerRequest` payload with a unique ID, sending it via `postMessage()`.
4. **Execution**: The Web Worker (`cipher.worker.ts`) acts as a router, calling the selected cipher's `encrypt` or `decrypt` module function.
5. **Path selection**: If the UI is open, the instrumented path runs to produce `steps[]` trace data; otherwise, a fast path executes.
6. **Worker response**: The worker returns the `WorkerResponse` with the `CipherResult` object (containing `output` and `steps[]`).
7. **Animation trigger**: The hook resolves the promise, updates the Zustand state, and populates the `StepAnimator` UI component for display.

### Key Architectural Decisions

| Decision | Choice | Rationale | Trade-off |
| :--- | :--- | :--- | :--- |
| **Deployment Model** | Next.js Static Export (`output: 'export'`) | High scalability, zero hosting costs, and server-side safety under Vercel Free Tier. | No runtime Node.js middleware; requires static pre-generation. |
| **Cryptography Threading** | Browser Web Workers | Offloads math operations from the UI thread to prevent browser interface freeze. | Message serialization latency between main thread and worker. |
| **Cryptographic Primitives** | `@noble/*` Libraries | Audited, secure, dependency-free, and tree-shakeable alternative to legacy modules. | Minimal feature footprint; requires custom implementation of block modes. |
| **Static Site Search** | Pagefind WASM | Compiles a static search index at build time, executing search directly in WASM. | Requires a local build hook step to generate indexes. |
| **State Management** | Zustand | Lightweight state store with URL hash synchronization. | Manual sync needed to prevent SSR mismatches. |
| **Testing Harness** | Vitest | Extremely fast, ESM-native test runner sharing Next.js configurations. | Simulates DOM APIs via jsdom. |
| **Component System** | Radix UI Primitive wrapper | Unstyled accessible base primitives designed to be styled using Tailwind. | Requires writing custom Tailwind wrappers for each component. |

### SaaS Architecture (Additive Layer)
The SaaS layer (Phase 9) integrates seamlessly as an additive option without altering the static visualizer core:
- **Auth**: Executed on Vercel Serverless Functions utilizing `better-auth` supporting OAuth and password flows.
- **Database**: `Neon` Serverless PostgreSQL managed via `Drizzle ORM`.
- **Payments**: `Stripe Checkout` redirects and customer portal webhook synchronizations.
- **Messaging**: `Resend` APIs for transaction alerts and user confirmations.
- **Rate Limiting**: `Upstash Redis` token-bucket rate limits on edge functions.

---

## Tech Stack

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | 15.x | Application engine and routing shell |
| **Language** | TypeScript | 5.x | Strict-type compiler correctness |
| **Styling** | Tailwind CSS | v4 | Utility-first cascading style engine |
| **UI Primitives** | Radix UI | Latest | Accessible, unstyled React base controls |
| **Animation** | Motion (Framer) | Latest | Fluid transitions and timeline animations |
| **Crypto Primitives** | `@noble/hashes` & `@noble/curves` | Latest | Standard secure hashing, HMAC, KDF, and ECDSA |
| **Native API** | WebCrypto API | Standard | Secure AES block encryption and key management |
| **State Management** | Zustand | Latest | Unified UI settings and parameter synchronization |
| **Content Render** | `next-mdx-remote` | Latest | Dynamic build-time MDX content assembly |
| **Search Engine** | Pagefind | Latest | Statically-indexed client search module |
| **Unit Testing** | Vitest | Latest | In-memory unit and mathematical tests |
| **E2E Testing** | Playwright | Latest | Browser automation verification |
| **A11y Audit** | axe-core | Latest | Automated WCAG accessibility verification |
| **CI Workflow** | GitHub Actions | Standard | Build, lint, typecheck, and validation runner |
| **Hosting Platform** | Vercel | Standard | Static edge hosting and preview deployment |
| **Auth System** | `better-auth` | Latest | Multi-provider client security manager |
| **Database Engine** | Neon Postgres | Latest | SQL server database storage |
| **ORM Wrapper** | Drizzle ORM | Latest | Type-safe SQL schema database definitions |
| **Payment Gateway** | Stripe API | Latest | User premium access control and checkouts |
| **Email Relay** | Resend | Latest | Transactional notifications and verification mail |

---

## Browser Compatibility

CryptoViz is a client-side cryptography visualization platform that runs entirely inside the browser. It requires a modern browser with support for JavaScript, Web Workers, and the WebCrypto API.

### Supported Desktop Browsers

| Browser | Support |
| :--- | :--- |
| Google Chrome | ✅ Supported |
| Microsoft Edge | ✅ Supported |
| Mozilla Firefox | ✅ Supported |
| Safari | ✅ Supported |

### Supported Mobile Browsers

| Browser | Support |
| :--- | :--- |
| Chrome Mobile (Android) | ✅ Supported |
| Safari Mobile (iOS) | ✅ Supported |
| Firefox Mobile | ✅ Supported |

### Required Browser Features

CryptoViz requires the following browser capabilities:

- **JavaScript enabled** for application functionality.
- **Web Workers** for running cryptographic calculations in background threads.
- **WebCrypto API** support for browser-based cryptographic operations.
- **ES6+ JavaScript support** for modern application features.

### Recommended Browser Versions

For the best performance, security, and compatibility, use the latest stable version of:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

### Unsupported or Partially Supported Browsers

Older browsers that do not support modern JavaScript features, Web Workers, or WebCrypto API may not function correctly.

Users should update their browser to the latest available version to ensure proper performance and security.

---

## ⚡Getting Started

### Prerequisites

Ensure you have the following installed before launching:

| Utility | Minimum Version | Check Command |
| :--- | :--- | :--- |
| **Node.js** | 22.x LTS | `node -v` |
| **npm** | 10.x+ | `npm -v` |
| **Git** | Latest | `git --version` |

### Before You Begin

Make sure you have:

- Node.js 22.x LTS installed
- npm 10.x or later installed
- Git installed
- A modern web browser such as Chrome, Edge, Firefox, or Safari

You can verify the installed versions with:

```bash
node -v
npm -v
git --version
```

### Step-by-Step Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/csxark/CryptoViz.git
   cd CryptoViz
    ```
  > If you are contributing to CryptoViz, fork the repository first and clone your fork instead.
  
2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

   ![Successful npm install](./docs/screenshots/npm-install-success.png)

   *Successful dependency installation using `npm install`.*


3. **Configure environment variables**

   Create a `.env.local` file in the root of the project:

   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start the development server**

   Start the Next.js development server:

   ```bash
   npm run dev
   ```

Open `http://localhost:3000` in your web browser. You should see the CryptoViz landing page with the navigation bar and theme toggle fully functional.

![CryptoViz landing page](./docs/screenshots/cryptoviz-landing-page.png)

*CryptoViz running locally at `http://localhost:3000`.*

---


## Commands Reference

Use the following commands during development:

| Command | Description | When to use |
| :--- | :--- | :--- |
| `npm install` | Installs project dependencies. | After cloning the repository or when dependencies change. |
| `npm run dev` | Starts the development server. | During active development. |
| `npm run build` | Creates a production build of the project. | Before deployment or when verifying a production build. |
| `npm run lint` | Runs ESLint and checks the code for linting issues. | Before committing or opening a pull request. |
| `npm start` | Starts the production server after a successful build. | When previewing the production build locally. |

---

## Troubleshooting

If you encounter issues while setting up or developing CryptoViz, try the solutions below before opening an issue.

### 1. `npm install` fails

**Problem**

Dependencies fail to install or installation stops with errors.

**Solution**

- Ensure you are using **Node.js 22.x LTS** and **npm 10.x+**.
- Remove the existing dependencies and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### 2. `npm run build` fails

**Problem**

The production build exits with compilation or type errors.

**Solution**

- Verify all dependencies are installed.
- Fix any TypeScript or ESLint errors shown in the terminal.
- Run:

```bash
npm run lint
npm run build
```

again after resolving the reported issues.

---

### 3. Development server does not start

**Problem**

Running `npm run dev` does not launch the local development server.

**Solution**

- Confirm that dependencies are installed.
- Check whether port **3000** is already in use.
- Restart the terminal and run:

```bash
npm run dev
```

---

### 4. Missing `.env.local` configuration

**Problem**

The application cannot access required environment variables.

**Solution**

Create a `.env.local` file in the project root and add the required variables, for example:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Restart the development server after saving the file.

---

### 5. Node.js version mismatch

**Problem**

Commands fail because an unsupported Node.js version is installed.

**Solution**

Check your installed version:

```bash
node -v
```

If needed, upgrade to **Node.js 22.x LTS**, then reinstall dependencies using:

```bash
npm install
```

### 6. Windows PowerShell command issues

If a command such as `rm -rf` does not work in Windows PowerShell, use the PowerShell equivalent instead:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### General Debugging Tips

- Pull the latest changes from the `main` branch before starting work.
- Run `npm install` after updating dependencies.
- Restart the development server after modifying environment variables.
- Read terminal error messages carefully to identify the root cause.
- Run `npm run lint` before creating a pull request.

---

## 🤝Contributing

We welcome contributions to CryptoViz. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and [GUIDELINES.md](./GUIDELINES.md) to understand local development protocols, code structure, and pull request rules.

- **To add a new cipher**: Create a pure mathematical module, add tests, and update the Web Worker router.
- **To add a new doc**: Add a `.mdx` file to the content path with the required Zod frontmatter fields.
- **To add a resource**: Update the static resource array database with verified HTTPS URLs.

### Constants Naming Convention

CryptoViz enforces a lint-friendly, centralized naming convention for application constants:

- **Central Module**: All shared constants (storage keys, collection limits, event names, performance thresholds, and schema versions) are defined in [`constants/index.ts`](./constants/index.ts) and exported via `@/constants`.

- **`CRYPTOVIZ_` Prefix**: All global constants use UPPER_SNAKE_CASE prefixed with **`CRYPTOVIZ_`** (e.g., `CRYPTOVIZ_BENCHMARK_HISTORY_KEY`, `CRYPTOVIZ_MAX_FAVORITE_CIPHERS`, `CRYPTOVIZ_SPEEDUP_THRESHOLD`).
- **No Hard-coded Strings**: Modules across the codebase import constants directly from `@/constants` to ensure maintainability, avoid magic strings, and satisfy linter rules.


---

## ❓Frequently Asked Questions (FAQ)

### Which Node.js version is recommended?

CryptoViz recommends using **Node.js 22.x LTS** along with **npm 10.x or later**. You can verify your installation using:

```bash
node -v
npm -v
```

For more details, see the **Getting Started** section.

---

### Does CryptoViz require a backend server?

No. CryptoViz is a fully static **Next.js 15** application that runs entirely in the browser using **Web Workers**. A backend server is not required for the core visualization features.

---

### Which browsers are officially supported?

CryptoViz supports the latest stable versions of:

- Google Chrome
- Microsoft Edge
- Mozilla Firefox
- Safari

It also supports modern mobile browsers that provide JavaScript, Web Workers, and WebCrypto API support.

See the **Browser Compatibility** section for more information.

---

### Where are the cipher implementations located?

Cipher implementations are located in:

```text
lib/cipher/
```

The Web Worker responsible for executing cipher operations is located in:

```text
lib/workers/
```

---

### How do I add a new cipher?

To add a new cipher:

1. Create a new implementation inside `lib/cipher/`.
2. Register it in the Web Worker router.
3. Add the required unit tests.
4. Update the visualizer UI if necessary.

See the **Contributing** section for additional guidance.

---

### How do I run tests before submitting a pull request?

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

These commands help ensure that the project builds successfully and follows the project's code quality checks before review.


---

### Where can I report bugs or request new features?

Please open a GitHub Issue describing the bug or feature request. Include clear reproduction steps or implementation details whenever possible.

---

## 📄License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details. CryptoViz is built primarily for cybersecurity education and interactive learning purposes.

---

## 💖Acknowledgements

- **@noble libraries**: Paulmillr's highly optimized, audited cryptographic libraries.
- **Radix UI**: Accessible primitives enabling clean Tailwind components.
- **Pagefind**: Fast, static indexing engine running inside WASM.
- **NIST & IETF**: FIPS and RFC committees for publishing test vectors.
## Continuous Integration

GitHub Actions automatically validates every pull request targeting the `main` branch by running:

- ESLint
- TypeScript type checking
- Unit tests
- Production build

Repository maintainers can optionally enable GitHub Branch Protection Rules to require these checks before merging.
