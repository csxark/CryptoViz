# Practice Challenge Question Bank

## Overview

The **Practice Challenge Question Bank** (`/challenge`) provides curated
multiple-choice questions covering core cryptography concepts across
classical ciphers, symmetric cryptography, asymmetric cryptography, hash
functions, and cryptographic attacks.

The question bank is backed directly by `lib/challenge/questionBank.ts`.
The repository currently contains **67 curated questions**.

The question count should be treated as a repository metric rather than a
fixed marketing claim. The application derives its displayed count directly
from the question bank to prevent stale or inflated numbers.

---

## Question Bank Structure

| Category | Topics Covered |
| --- | --- |
| **Classical Ciphers** | Caesar, ROT13, Atbash, Vigenère, Playfair, Rail Fence, Affine, Enigma |
| **Symmetric Encryption** | AES, DES, 3DES, Blowfish, Twofish, ChaCha20, block cipher modes, padding |
| **Asymmetric Cryptography** | RSA, Diffie-Hellman, ECC, ECDSA, post-quantum cryptography |
| **Hash & KDF Primitives** | SHA-256, SHA-3, HMAC, PBKDF2, Argon2id and related concepts |
| **Attacks & Security** | Padding oracles, replay attacks, birthday attacks, timing attacks and related security concepts |

---

## Question Format

Each question is represented by a `QuizQuestion` object containing:

- A unique question ID
- A cryptographic category
- A difficulty level
- An optional cipher or primitive ID
- The question prompt
- Four answer options
- The correct answer index
- An explanation
- A learning hint
- Searchable tags

The canonical type is defined in:

```text
lib/challenge/questionBank.ts