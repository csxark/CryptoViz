# Security Policy

## Supported Versions

CryptoViz is currently pre-1.0 (`0.1.0`) and under active development. There is currently a single rolling development release, and security fixes are targeted at the latest version on the `main` branch.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

Once CryptoViz reaches a stable 1.0 release, this policy will be updated to define the supported release window.

## Reporting a Vulnerability

Please **do not open a public GitHub issue** for security vulnerabilities.

If GitHub Private Vulnerability Reporting is enabled for this repository, it can be used through the repository's **Security** tab to submit a private report.

Alternatively, security vulnerabilities can be reported directly to:

**[arktandoncs@gmail.com](mailto:arktandoncs@gmail.com)**

When reporting a vulnerability, please include:

* A description of the vulnerability and its potential impact
* Steps to reproduce the issue
* Proof-of-concept code or input, where applicable
* The affected version or commit
* Any suggested remediation, if available

We aim to acknowledge security reports within 5 business days and provide an initial assessment within 14 days. Response times may vary depending on the severity of the issue and maintainer availability.

Please allow a reasonable amount of time for the issue to be investigated and addressed before making the vulnerability public.

## Scope & Architecture

CryptoViz is primarily a **client-side, browser-based educational application** for visualizing cryptographic algorithms.

The application is configured as a fully static Next.js export using `output: 'export'`. The core visualizer therefore runs in the browser and does not currently depend on a backend service for its primary functionality.

Any SaaS architecture involving authentication, billing, databases, or backend services is currently planned/theoretical and is not part of the active deployed application scope.

### Static Export Security Headers

Because CryptoViz is deployed as a static Next.js export, Next.js middleware does not execute as it would in a server-side or edge deployment. The `middleware.ts` file therefore should not be considered the production source of truth for security headers in the static deployment.

Production security headers, including the Content Security Policy and other browser security headers, are configured in `vercel.json`.

The deployment-level configuration should remain the source of truth for response security headers unless the application is migrated to an SSR or edge deployment where middleware can execute.

## ⚠️ Known Educational Security Limitations

CryptoViz is designed to **teach and visualize cryptographic algorithms**, not to provide production-grade cryptographic functionality.

Some implementations intentionally use simplified or insecure techniques so that cryptographic operations can be visualized and reproduced consistently. These limitations must not be interpreted as suitable for protecting real-world sensitive information.

### Embedded RSA Demo Key

The RSA real-mode visualizer contains a fixed 2048-bit RSA key pair embedded directly in the application source code.

The key is used by the RSA real encryption and decryption demonstration so that the operation can be reproduced and round-tripped consistently in the browser.

Because the private key is publicly available in the source code, it must **not** be considered secret or secure for protecting real data.

Applications requiring RSA encryption should generate or securely provision their own key pairs and keep private keys outside source code and version control.

### `Math.random()` in ElGamal

The ElGamal implementation uses JavaScript's `Math.random()` to generate the ephemeral key `k`.

`Math.random()` is not a cryptographically secure random-number generator and must not be used for cryptographic key or nonce generation in production security-sensitive applications.

This behavior is an intentional limitation of the educational implementation and means that the ElGamal visualizer must not be relied upon to provide real-world cryptographic security.

Production cryptographic applications should use an appropriate cryptographically secure random-number generator, such as the Web Crypto API.

### Intentionally Weak and Legacy Algorithms

CryptoViz includes algorithms such as Caesar, ROT13, XOR, DES, 3DES, and MD5 for educational and visualization purposes.

These algorithms are documented by the project as legacy, deprecated, or broken where applicable. Their inclusion is intended to demonstrate historical cryptographic techniques and their weaknesses.

Their presence in the project should therefore not be interpreted as a recommendation to use them for protecting sensitive information.

If you discover a security issue in an implementation beyond these documented educational limitations, please report it through the vulnerability-reporting process above.

## Reporting Non-Security Issues

Bugs that are not security-sensitive, including ordinary implementation issues, incorrect non-exploitable cipher output, UI problems, and feature requests, should be reported through the normal GitHub Issues tracker.
