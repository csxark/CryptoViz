# CryptoViz — Cryptographic Conformance & Evidence Matrix

This matrix documents the verification classification, operational semantics, authoritative standards provenance, independent oracles, and evidence grade for all **218** algorithms registered in CryptoViz.
Regenerated from `lib/cipher/provenance/oracleRegistry.json` under the Grade-E Elimination & Independent Cryptographic Verification Gate.

## Evidence Grade Definitions

* **Grade A (Authoritative + Independent Validation)**: Published standard KAT (NIST CAVP / RFC / ISO) verified AND independently validated against external reference oracle (`node:crypto` / `@noble`).
* **Grade B (Independent Validation)**: Validated against an independent reference oracle or formal reference model.
* **Grade C (Strong Property Validation)**: Strong algebraic and invariant property validation (reversible bijection, group laws, fuzzing).
* **Grade D (Educational / Non-Standard / Toy)**: Educational or pedagogical implementation verified for internal consistency and expected educational properties.
* **Grade E (Unverified)**: Incomplete tables, placeholder vectors, or unverified implementations. Strictly NOT claimed as standards-compliant.

## Summary Grade Distribution

| Grade | Description | Count | Percentage |
| :--- | :--- | :--- | :--- |
| **A** | Authoritative + Independent Oracle | 37 | 17.0% |
| **B** | Independent Reference Oracle | 26 | 11.9% |
| **C** | Strong Property Validation | 26 | 11.9% |
| **D** | Educational / Toy Reference | 10 | 4.6% |
| **E** | Unverified / Pending Audit | 119 | 54.6% |
| **Total** | All Active Registered Algorithms | **218** | **100.0%** |

---

## Complete Algorithm Matrix

| Algorithm | Operation | Classification | Standard | KAT | Independent Oracle | Differential | Property | Browser | Evidence Grade |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Caesar Cipher** (`caesar`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **ROT13** (`rot13`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Vigenère Cipher** (`vigenere`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Atbash Cipher** (`atbash`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Playfair Cipher** (`playfair`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Rail Fence Cipher** (`railfence`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Trithemius Cipher** (`trithemius`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Bacon's Cipher** (`bacon`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Affine Cipher** (`affine`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **XOR Cipher** (`xor`) | `encrypt` | symmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **One-Time Pad (OTP)** (`otp`) | `encrypt` | symmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **DES** (`des`) | `encrypt` | symmetric | NIST FIPS 46-3 | NIST FIPS 46-3 Conformance Test Vectors | node:crypto (createCipheriv des-ecb) | Yes | Yes | Yes (JS/Worker) | **A** |
| **3DES (Triple DES)** (`3des`) | `encrypt` | symmetric | ANSI X9.52 / NIST SP 800-67 Rev 2 | NIST SP 800-67 Appendix B / CAVP TDES Vectors | node:crypto (createCipheriv des-ede3-ecb) | Yes | Yes | Yes (JS/Worker) | **A** |
| **AES-XTS** (`aes-xts`) | `encrypt` | symmetric | IEEE 1619-2007 / NIST SP 800-38E | IEEE 1619 Annex C / NIST CAVP XTS Test Vectors | node:crypto (createCipheriv aes-128/256-xts) | Yes | Yes | Yes (JS/Worker) | **A** |
| **AES** (`aes`) | `encrypt` | symmetric | NIST FIPS 197 / NIST SP 800-38A | NIST CAVP / FIPS 197 Appendix C | node:crypto (createCipheriv aes-128/192/256-ecb) | Yes | Yes | Yes (JS/Worker) | **A** |
| **Camellia** (`camellia`) | `encrypt` | symmetric | ISO/IEC 18033-3:2010 / RFC 3713 | RFC 3713 Appendix A (128/192/256-bit KAT) | node:crypto (createCipheriv camellia-128-ecb) | Yes | Yes | Yes (JS/Worker) | **A** |
| **Serpent** (`serpent`) | `encrypt` | symmetric | Anderson, Biham, Knudsen (1998) | NESSIE / NIST AES Submission Serpent Test Vectors | Serpent Reference Suite | Yes | Yes | Yes (JS/Worker) | **B** |
| **ChaCha20-Poly1305** (`chacha20-poly1305`) | `encrypt` | symmetric | RFC 8439 | RFC 8439 Section 2.8.2 AEAD Test Vectors | node:crypto (createCipheriv chacha20-poly1305) | Yes | Yes | Yes (JS/Worker) | **A** |
| **Speck128/128** (`speck`) | `encrypt` | symmetric | ISO/IEC 29192-2 Amd 2 / Beaulieu et al. (NSA 2013) | NSA SPECK-128/128 Test Vectors | NSA Speck Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **AES-CCM** (`aes-ccm`) | `encrypt` | symmetric | NIST SP 800-38C | NIST SP 800-38C Appendix C Example 1-4 | node:crypto (createCipheriv aes-128-ccm) | Yes | Yes | Yes (JS/Worker) | **A** |
| **Threefish-256** (`threefish`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **XChaCha20** (`xchacha20`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Twofish** (`twofish`) | `encrypt` | symmetric | Schneier, Kelsey, Whiting, Wagner, Hall, Ferguson (1998) | NIST AES Submission Official KAT Vectors | Twofish AES Submission Reference | Yes | Yes | Yes (JS/Worker) | **B** |
| **GOST 28147-89** (`gost`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RC2** (`rc2`) | `encrypt` | symmetric | RFC 2268 | RFC 2268 Section 6 Test Vectors | RFC 2268 Standard Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **Enigma (I, 3-rotor)** (`enigma`) | `encrypt` | symmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **ASCON-128** (`ascon`) | `encrypt` | symmetric | NIST SP 800-232 / Dobraunig et al. | NIST LWC Official Ascon-128 KAT Vectors | NIST LWC Reference Implementation | Yes | Yes | Yes (JS/Worker) | **B** |
| **XSalsa20** (`xsalsa20`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Trivium** (`trivium`) | `encrypt` | symmetric | ISO/IEC 29192-3:2012 / De Cannière & Preneel (eSTREAM) | eSTREAM Trivium Profile 2 Test Vectors | eSTREAM Reference Suite | Yes | Yes | Yes (JS/Worker) | **B** |
| **SM4** (`sm4`) | `encrypt` | symmetric | GB/T 32907-2016 / RFC 8998 | GB/T 32907-2016 Section 9 / RFC 8998 Appendix A | node:crypto (createCipheriv sm4-ecb) | Yes | Yes | Yes (JS/Worker) | **A** |
| **PRESENT** (`present`) | `encrypt` | symmetric | ISO/IEC 29192-2:2012 / Bogdanov et al. (CHES 2007) | ISO/IEC 29192-2 Test Vectors | ISO/IEC 29192-2 Reference | Yes | Yes | Yes (JS/Worker) | **B** |
| **SIMON-32/64** (`simon32`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **TEA** (`tea`) | `encrypt` | symmetric | Wheeler & Needham (Fast Software Encryption 1994) | Wheeler & Needham Published Vectors | TEA Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **NOEKEON** (`noekeon`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **LEA** (`lea`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **GIFT-64** (`gift`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **XXTEA** (`xxtea`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Blowfish** (`blowfish`) | `encrypt` | symmetric | Bruce Schneier (Fast Software Encryption 1993) | Schneier (1993) Published Test Vectors | Schneier Reference Suite | Yes | Yes | Yes (JS/Worker) | **B** |
| **Streebog-256** (`streebog`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SEED-128** (`seed`) | `encrypt` | symmetric | RFC 4269 / ISO/IEC 18033-3:2010 | RFC 4269 Appendix A Test Vectors | RFC 4269 Standard Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **Kuznyechik** (`kuznyechik`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SIMON-128/128** (`simon`) | `encrypt` | symmetric | ISO/IEC 29192-2 Amd 2 / Beaulieu et al. (NSA 2013) | NSA SIMON-128/128 Test Vectors | NSA Simon Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **Rabbit** (`rabbit`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **HC-128** (`hc128`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Anubis** (`anubis`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **MARS** (`mars`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **CLEFIA** (`clefia`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **MISTY1** (`misty1`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Square** (`square`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Truncated Table Stub (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
| **FEAL-8** (`feal`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SAFER+** (`safer-plus`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **ARIA** (`aria`) | `encrypt` | symmetric | KS X 1213:2004 / RFC 5794 | RFC 5794 Appendix A (128/192/256-bit KAT) | node:crypto (createCipheriv aria-128-ecb) | Yes | Yes | Yes (JS/Worker) | **A** |
| **KASUMI** (`kasumi`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Grain-128** (`grain128`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **3-Way** (`3way`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **A5/1** (`a5-1`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Lucifer** (`lucifer`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **DEAL** (`deal`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **DES-X** (`des-x`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Khufu** (`khufu`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **MICKEY** (`mickey`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Kalyna** (`kalyna`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Truncated Table Stub (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
| **ZUC** (`zuc`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SOSEMANUK** (`sosemanuk`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Truncated Table Stub (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
| **LOKI97** (`loki97`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SEAL** (`seal`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SHARK** (`shark`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Turing** (`turing`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Crypton** (`crypton`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **WAKE** (`wake`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Hierocrypt-3** (`hierocrypt3`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **PRINCE** (`prince`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **E2** (`e2`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **TWINE** (`twine`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **CAST-128 (CAST5)** (`cast128`) | `encrypt` | symmetric | RFC 2144 | RFC 2144 Appendix B Test Vectors | RFC 2144 Standard Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **MIDORI** (`midori`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SKINNY-128** (`skinny`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **LBlock** (`lblock`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **MANTIS** (`mantis`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **LED** (`led`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **AEGIS-128L** (`aegis128l`) | `encrypt` | symmetric | RFC 9637 | RFC 9637 AEGIS-128L Test Vectors | RFC 9637 Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **SATURNIN** (`saturnin`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RECTANGLE** (`rectangle`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Deoxys-II-256** (`deoxys`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **E0** (`e0`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **PICCOLO** (`piccolo`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **CRAFT** (`craft`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SCHWAEMM256-128** (`schwaemm`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Romulus-N** (`romulus`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SHA-256** (`sha256`) | `hash` | hash | NIST FIPS 180-4 | NIST CAVP / FIPS 180-4 Appendix B | node:crypto (createHash sha256) & @noble/hashes/sha2 | Yes | Yes | Yes (JS/Worker) | **A** |
| **ESCH256** (`esch`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SIMD** (`simd`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SHAvite-3** (`shavite3`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **ECHO** (`echo`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Hamsi** (`hamsi`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Blue Midnight Wish** (`bmw`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **CubeHash** (`cubehash`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Haraka** (`haraka`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Shabal** (`shabal`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SHA-512** (`sha512`) | `hash` | hash | NIST FIPS 180-4 | NIST CAVP / FIPS 180-4 Appendix C | node:crypto (createHash sha512) & @noble/hashes/sha2 | Yes | Yes | Yes (JS/Worker) | **A** |
| **SM3 Hash** (`sm3`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Non-Standard Digest Discrepancy (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
| **MD5** (`md5`) | `hash` | hash | RFC 1321 | RFC 1321 Appendix A.5 Reference Test Suite | node:crypto (createHash md5) | Yes | Yes | Yes (JS/Worker) | **A** |
| **Luffa** (`luffa`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **HMAC-SHA256** (`hmac`) | `mac` | hash | RFC 2104 / RFC 4231 / FIPS 198-1 | RFC 4231 Test Cases 1-7 (HMAC-SHA256) | node:crypto (createHmac) & @noble/hashes/hmac | Yes | Yes | Yes (JS/Worker) | **A** |
| **AES-CMAC** (`cmac`) | `mac` | hash | NIST SP 800-38B | NIST SP 800-38B Appendix D AES-CMAC Example Vectors | Independent Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **Bcrypt** (`bcrypt`) | `hash` | hash | Provos & Mazières (USENIX Security 1999) | OpenBSD / Solar Designer bcrypt test vectors | bcryptjs | Yes | Yes | Yes (JS/Worker) | **B** |
| **XXHash32** (`xxhash`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Bloom Filter Simulator** (`bloom-filter`) | `educational-demo` | hash | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **HKDF (HMAC Key Derivation)** (`hkdf`) | `kdf` | hash | RFC 5869 | RFC 5869 Appendix A Test Cases 1-3 | node:crypto (hkdfSync) & @noble/hashes/hkdf | Yes | Yes | Yes (JS/Worker) | **A** |
| **BLAKE2s** (`blake2s`) | `hash` | hash | RFC 7693 | RFC 7693 Appendix E Official Test Vectors | node:crypto (createHash blake2s256) & @noble/hashes/blake2s | Yes | Yes | Yes (JS/Worker) | **A** |
| **SHA-224** (`sha224`) | `hash` | hash | NIST FIPS 180-4 | NIST CAVP / FIPS 180-4 Appendix A | node:crypto (createHash sha224) & @noble/hashes/sha2 | Yes | Yes | Yes (JS/Worker) | **A** |
| **SHA-384** (`sha384`) | `hash` | hash | NIST FIPS 180-4 | NIST CAVP / FIPS 180-4 Appendix D | node:crypto (createHash sha384) & @noble/hashes/sha2 | Yes | Yes | Yes (JS/Worker) | **A** |
| **SHAKE128** (`shake128`) | `hash` | hash | NIST FIPS 202 | NIST CAVP SHAKE128 Variable Output Length KATs | node:crypto (createHash shake128) & @noble/hashes/sha3 | Yes | Yes | Yes (JS/Worker) | **A** |
| **SHAKE256** (`shake256`) | `hash` | hash | NIST FIPS 202 | NIST CAVP SHAKE256 Variable Output Length KATs | node:crypto (createHash shake256) & @noble/hashes/sha3 | Yes | Yes | Yes (JS/Worker) | **A** |
| **PBKDF2** (`pbkdf2`) | `kdf` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Placeholder HMAC Stub (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
| **MD4** (`md4`) | `hash` | hash | RFC 1320 | RFC 1320 Appendix A.5 Test Suite | RFC 1320 Author Reference Vectors | Yes | Yes | Yes (JS/Worker) | **B** |
| **Argon2id** (`argon2`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Simplified Demonstration Stub (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
| **Skein-256** (`skein`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **LSH-256** (`lsh256`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Tiger** (`tiger`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Grøstl-256** (`grostl`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **JH-256** (`jh`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RIPEMD-128** (`ripemd128`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **HAVAL** (`haval`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **MD2** (`md2`) | `hash` | hash | RFC 1319 | RFC 1319 Appendix A.5 Test Suite | RFC 1319 Author Reference Vectors | Yes | Yes | Yes (JS/Worker) | **B** |
| **GOST R 34.11-94** (`gost-r34-11-94`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **N-Hash** (`n-hash`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Snefru** (`snefru`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **HAS-160** (`has160`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Panama** (`panama`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **BLAKE** (`blake`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Kupyna** (`kupyna`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RadioGatun** (`radiogatun`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Ascon-Hash** (`ascon-hash`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RIPEMD-256** (`ripemd256`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RIPEMD-320** (`ripemd320`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **KangarooTwelve** (`kangarootwelve`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Fugue** (`fugue`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Edon-R** (`edon-r`) | `hash` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **RSA-2048** (`rsa`) | `encrypt` | asymmetric | PKCS #1 v2.2 / RFC 8017 | RFC 8017 / NIST CAVP RSA2048 Vectors | node:crypto (generateKeyPairSync, publicEncrypt, privateDecrypt) | Yes | Yes | Yes (JS/Worker) | **B** |
| **DSA** (`dsa`) | `sign` | asymmetric | NIST FIPS 186-4 | NIST CAVP DSA Test Vectors | node:crypto (sign, verify) | Yes | Yes | Yes (JS/Worker) | **B** |
| **Diffie-Hellman** (`dh`) | `key-agreement` | asymmetric | RFC 2631 / RFC 3526 | RFC 3526 2048-bit MODP Group 14 Test Vectors | node:crypto (createDiffieHellman) | Yes | Yes | Yes (JS/Worker) | **B** |
| **X448** (`x448`) | `encrypt` | asymmetric | RFC 7748 | RFC 7748 Section 6.2 Curve448 Test Vectors | @noble/curves/ed448 (x448) | Yes | Yes | Yes (JS/Worker) | **A** |
| **ECC (ECDSA P-256)** (`ecc`) | `encrypt` | asymmetric | NIST FIPS 186-4 / RFC 6979 | RFC 6979 P-256 ECDSA Test Vectors | @noble/curves/p256 | Yes | Yes | Yes (JS/Worker) | **A** |
| **Schnorr (BIP340)** (`schnorr`) | `sign` | asymmetric | BIP 340 (Bitcoin Improvement Proposal) | BIP 340 Official CSV Test Vectors | @noble/curves/secp256k1.schnorr | Yes | Yes | Yes (JS/Worker) | **A** |
| **ElGamal Signature** (`elgamal-signature`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **ML-DSA-65** (`ml-dsa`) | `encrypt` | asymmetric | NIST FIPS 204 | NIST FIPS 204 / CAVP Intermediate Test Vectors | @noble/post-quantum/ml-dsa | Yes | Yes | Yes (JS/Worker) | **A** |
| **ECIES (X25519)** (`ecies`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **ML-KEM-768** (`ml-kem`) | `kem-encapsulate` | asymmetric | NIST FIPS 203 | NIST FIPS 203 / CAVP Intermediate Test Vectors | @noble/post-quantum/ml-kem | Yes | Yes | Yes (JS/Worker) | **A** |
| **FrodoKEM-640** (`frodokem`) | `kem-encapsulate` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Ed448** (`ed448`) | `encrypt` | asymmetric | RFC 8032 | RFC 8032 Section 7.3 Ed448 Test Vectors | @noble/curves/ed448 | Yes | Yes | Yes (JS/Worker) | **A** |
| **Shamir's Secret Sharing** (`shamir-secret-sharing`) | `split` | asymmetric | Foundational Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **SIDH** (`sidh`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **NTRU** (`ntru`) | `kem-encapsulate` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **GOST R 34.10-2012** (`gost-r34-10`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Classic McEliece** (`mceliece`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Cramer-Shoup** (`cramer-shoup`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SM2** (`sm2`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **KCDSA** (`kcdsa`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Goldwasser-Micali** (`goldwasser-micali`) | `encrypt` | asymmetric | Foundational Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **GGH** (`ggh`) | `encrypt` | asymmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **BLS** (`bls`) | `sign` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Boneh-Franklin IBE** (`boneh-franklin-ibe`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Regev-LWE** (`regev-lwe`) | `encrypt` | asymmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **Okamoto-Uchiyama** (`okamoto-uchiyama`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SQIsign** (`sqisign`) | `sign` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Chor-Rivest** (`chor-rivest`) | `encrypt` | asymmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **Rainbow** (`rainbow`) | `sign` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **MQV** (`mqv`) | `key-agreement` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Falcon** (`falcon`) | `sign` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Niederreiter** (`niederreiter`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **XMSS** (`xmss`) | `sign` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **LMS** (`lms`) | `sign` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Lamport OTS** (`lamport`) | `sign` | asymmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **Streamlined NTRU Prime** (`ntruprime`) | `kem-encapsulate` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Winternitz OTS** (`wots`) | `sign` | asymmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **Keyword Substitution Cipher** (`keyword-substitution`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Gronsfeld Cipher** (`gronsfeld`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **CSIDH** (`csidh`) | `key-agreement` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **BIKE** (`bike`) | `kem-encapsulate` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **HQC** (`hqc`) | `kem-encapsulate` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **SPHINCS+ (SLH-DSA)** (`sphincs-plus`) | `sign` | asymmetric | NIST FIPS 205 | NIST FIPS 205 / SLH-DSA Conformance Vectors | @noble/post-quantum/slh-dsa | Yes | Yes | Yes (JS/Worker) | **A** |
| **SABER** (`saber`) | `kem-encapsulate` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **OPAQUE** (`opaque`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Blind RSA** (`blind-rsa`) | `encrypt` | asymmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **Beaufort Cipher** (`beaufort`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Hill Cipher** (`hill`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Columnar Transposition** (`columnar-transposition`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Autokey Vigenère** (`autokey`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Porta Cipher** (`porta`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **ADFGVX Cipher** (`adfgvx`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Bifid Cipher** (`bifid`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Nihilist Cipher** (`nihilist`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Polybius Square** (`polybius`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **AES-GCM (AEAD)** (`aes-gcm`) | `encrypt` | symmetric | NIST SP 800-38D | NIST CAVP GCM Test Vectors (Test Case 1-6) | node:crypto (createCipheriv aes-128/256-gcm) | Yes | Yes | Yes (JS/Worker) | **A** |
| **ECDSA (secp256k1)** (`ecdsa`) | `sign` | asymmetric | SECG SEC 1 / RFC 6979 | RFC 6979 Deterministic ECDSA Test Vectors | @noble/curves/secp256k1 | Yes | Yes | Yes (JS/Worker) | **A** |
| **Ed25519 (EdDSA)** (`ed25519`) | `sign` | asymmetric | RFC 8032 | RFC 8032 Section 7.1 Ed25519 Test Vectors | @noble/curves/ed25519 | Yes | Yes | Yes (JS/Worker) | **A** |
| **ElGamal** (`elgamal`) | `encrypt` | asymmetric | Foundational Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Merkle–Hellman Knapsack** (`merkle-hellman`) | `encrypt` | asymmetric | Educational Demonstration Literature | Educational / Toy Reference | None | No | Yes | Yes (JS/Worker) | **D** |
| **Paillier** (`paillier`) | `encrypt` | asymmetric | Foundational Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Rabin** (`rabin`) | `encrypt` | asymmetric | Foundational Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **X25519** (`x25519`) | `key-agreement` | asymmetric | RFC 7748 | RFC 7748 Section 6.1 Curve25519 Test Vectors | @noble/curves/ed25519 (x25519) | Yes | Yes | Yes (JS/Worker) | **A** |
| **SHA3-256** (`sha3`) | `hash` | hash | NIST FIPS 202 | NIST CAVP SHA3-256 Short/Long Message KATs | node:crypto (createHash sha3-256) & @noble/hashes/sha3 | Yes | Yes | Yes (JS/Worker) | **A** |
| **RIPEMD-160** (`ripemd160`) | `hash` | hash | ISO/IEC 10118-3:2004 / Dobbertin, Bosselaers, Preneel (1996) | ISO/IEC 10118-3 Standard Test Vectors | node:crypto (createHash ripemd160) & @noble/hashes/ripemd160 | Yes | Yes | Yes (JS/Worker) | **A** |
| **BLAKE2b-256** (`blake2b`) | `hash` | hash | RFC 7693 | RFC 7693 Appendix E Official Test Vectors | node:crypto (createHash blake2b512) & @noble/hashes/blake2b | Yes | Yes | Yes (JS/Worker) | **A** |
| **BLAKE3** (`blake3`) | `hash` | hash | O'Connor, Aumasson, Neves, Wilcox-O'Hearn (2020) | Official BLAKE3 Test Vector Suite (vectors.json) | @noble/hashes/blake3 | Yes | Yes | Yes (JS/Worker) | **A** |
| **Poly1305** (`poly1305`) | `mac` | hash | RFC 7539 / RFC 8439 | RFC 8439 Section 2.5.2 One-Time Authenticator Vectors | @noble/hashes/poly1305 | Yes | Yes | Yes (JS/Worker) | **A** |
| **SHA-1** (`sha1`) | `hash` | hash | NIST FIPS 180-4 | NIST CAVP / FIPS 180-4 Appendix A | node:crypto (createHash sha1) | Yes | Yes | Yes (JS/Worker) | **A** |
| **RC4** (`rc4`) | `encrypt` | symmetric | RFC 6229 / Rivest (1987) | RFC 6229 Test Vectors for the Stream Cipher RC4 | RFC 6229 Reference Vectors | Yes | Yes | Yes (JS/Worker) | **B** |
| **Salsa20** (`salsa20`) | `encrypt` | symmetric | Bernstein (2008) / eSTREAM Profile 1 | eSTREAM Project Official Salsa20 Test Vectors | eSTREAM Reference Suite | Yes | Yes | Yes (JS/Worker) | **B** |
| **Skipjack** (`skipjack`) | `encrypt` | symmetric | Literature Reference (Unverified in CryptoViz) | Grade E: Pending Independent Provenance | None | No | Yes | Yes (JS/Worker) | **E** |
| **ChaCha20** (`chacha20`) | `encrypt` | symmetric | RFC 7539 / RFC 8439 | RFC 8439 Section 2.4.2 Test Vectors | node:crypto (createCipheriv chacha20) | Yes | Yes | Yes (JS/Worker) | **A** |
| **RC5-32/12/16** (`rc5`) | `encrypt` | symmetric | RFC 2040 | RFC 2040 Appendix A Test Vectors | RFC 2040 Standard Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **XTEA** (`xtea`) | `encrypt` | symmetric | Needham & Wheeler (Technical Report 1997) | Needham & Wheeler (1997) Published Vectors | XTEA Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **RC6-32/20/16** (`rc6`) | `encrypt` | symmetric | Rivest, Robshaw, Sidney, Yin (1998) | NIST AES Submission RC6 Test Vectors | RC6 AES Submission Reference | Yes | Yes | Yes (JS/Worker) | **B** |
| **IDEA** (`idea`) | `encrypt` | symmetric | Lai & Massey (Eurocrypt 1991) | Lai & Massey (1991) Published Test Vectors | IDEA Reference Model | Yes | Yes | Yes (JS/Worker) | **B** |
| **Four-Square Cipher** (`four-square`) | `encrypt` | classical | Historical Cryptographic Literature | Algorithmic Property Invariants | None (Property-Driven Invariant Proofs) | No | Yes | Yes (JS/Worker) | **C** |
| **Scrypt** (`scrypt`) | `kdf` | hash | Literature Reference (Unverified in CryptoViz) | Grade E: Unmapped Engine Entry (Unverified) | None | No | Yes | Yes (JS/Worker) | **E** |
