// ────────────────────────────────────────────────────────────────────────────
// Interactive Cryptography Timeline Data
// Historical milestones from the earliest known ciphers (circa 100 BC)
// through to modern Post-Quantum Cryptography (2024+).
// ────────────────────────────────────────────────────────────────────────────

export type TimelineCategory =
  | "classical"
  | "world-war"
  | "modern"
  | "post-quantum";

export interface TimelineEntry {
  /** Unique ID for the entry */
  id: string;
  /** Display year(s) e.g. "c. 100 BC", "1977", "2016–2024" */
  year: string;
  /** Sortable numeric year (BC = negative) */
  sortYear: number;
  /** Short title */
  title: string;
  /** One‑sentence summary */
  summary: string;
  /** Detailed description (rendered in expanded card / modal) */
  description: string;
  /** Visual bucket */
  category: TimelineCategory;
  /** Hex colour for the timeline dot / accent */
  colour: string;
  /** Optional list of related algorithm IDs used elsewhere in CryptoViz */
  relatedCiphers?: string[];
  /** Optional documentation article slug */
  docSlug?: string;
  /** Significance tags */
  tags: string[];
}

// ── Helper to generate a stable-ish ID from the title ──────────────────────
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Colour palette per category ────────────────────────────────────────────
const CAT_COLOURS: Record<TimelineCategory, string> = {
  classical:    "#B45309",   // amber-700
  "world-war":  "#6B21A8",   // purple-700
  modern:       "#0D9488",   // teal-600
  "post-quantum": "#DC2626", // red-600
};

// ── Timeline Entries (ordered chronologically) ─────────────────────────────
export const timelineEntries: TimelineEntry[] = [
  // ═════════════════════════════════════════════════════════════════════════
  // CLASSICAL ERA  (≈100 BC – 1800s)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: slugify("Caesar cipher"),
    year: "c. 100 BC",
    sortYear: -100,
    title: "Caesar Cipher",
    summary:
      "Julius Caesar used a simple shift substitution to communicate with his generals — one of the earliest recorded uses of encryption.",
    description:
      "The Caesar Cipher shifts each letter of the plaintext by a fixed number of positions down the alphabet (typically 3). While trivially breakable today by brute force (only 25 possible keys) or frequency analysis, it laid the conceptual groundwork for all subsequent substitution ciphers. Caesar described its use in his commentaries on the Gallic Wars, making it the oldest documented military cipher.",
    category: "classical",
    colour: CAT_COLOURS.classical,
    relatedCiphers: ["caesar", "rot13"],
    tags: ["substitution", "shift-cipher", "military", "ancient"],
  },
  {
    id: slugify("Atbash cipher"),
    year: "c. 500 BC",
    sortYear: -500,
    title: "Atbash Cipher",
    summary:
      "A Hebrew monoalphabetic cipher that maps the alphabet in reverse — found in the Book of Jeremiah.",
    description:
      "Atbash replaces the first letter of the alphabet with the last, the second with the second-last, and so on (A↔Z, B↔Y, etc.). It was originally used with the Hebrew alphabet and appears in the Bible (Jeremiah 25:26 and 51:41), where the word 'Sheshach' is an Atbash encryption of 'Babylon'. The cipher is self-inverse, making encryption and decryption identical.",
    category: "classical",
    colour: CAT_COLOURS.classical,
    relatedCiphers: ["atbash"],
    tags: ["substitution", "ancient", "hebrew", "self-inverse"],
  },
  {
    id: slugify("Vigenère cipher"),
    year: "1553",
    sortYear: 1553,
    title: "Vigenère Cipher",
    summary:
      "Giovan Battista Bellaso (later misattributed to Vigenère) invented a polyalphabetic cipher that resisted frequency analysis for three centuries.",
    description:
      "The Vigenère cipher uses a keyword to select different Caesar shifts for each letter of the plaintext. It was described by Bellaso in 1553 but later wrongly credited to Blaise de Vigenère. For over 300 years it was considered 'le chiffre indéchiffrable' (the indecipherable cipher) until Charles Babbage and Friedrich Kasiski independently developed methods to break it by deducing the keyword length. The cipher is a critical precursor to the One-Time Pad.",
    category: "classical",
    colour: CAT_COLOURS.classical,
    relatedCiphers: ["vigenere"],
    tags: ["polyalphabetic", "keyword", "renaissance", "indecipherable"],
  },
  {
    id: slugify("Playfair cipher"),
    year: "1854",
    sortYear: 1854,
    title: "Playfair Cipher",
    summary:
      "Charles Wheatstone invented the first digraph substitution cipher, used by British forces in both Boer Wars and WWI.",
    description:
      "Playfair encrypts pairs of letters (digraphs) using a 5×5 key matrix. Because it operates on letter pairs rather than single characters, it resists simple frequency analysis. Named after Lord Playfair (who promoted it), the cipher was used by the British Army in the Second Boer War and World War I. The US Coast Guard also used it during WWII. Its relative security for hand ciphers made it a milestone in pre-digital cryptography.",
    category: "classical",
    colour: CAT_COLOURS.classical,
    relatedCiphers: ["playfair"],
    tags: ["digraph", "matrix", "military", "victorian"],
  },
  {
    id: slugify("Kerckhoffs principle"),
    year: "1883",
    sortYear: 1883,
    title: "Kerckhoffs's Principle",
    summary:
      "Auguste Kerckhoffs formulated the maxim that a cryptosystem should remain secure even if everything about the system — except the key — is public knowledge.",
    description:
      "In his seminal paper 'La Cryptographie Militaire', Auguste Kerckhoffs laid out six design principles for military ciphers. The second principle — that the system should not require secrecy and can fall into enemy hands without causing trouble — is now known as Kerckhoffs's Principle. It is the philosophical foundation of open cryptographic design, contrasting sharply with 'security through obscurity'.",
    category: "classical",
    colour: CAT_COLOURS.classical,
    tags: ["principle", "design", "open-design", "military"],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // WORLD WAR ERA  (1910s – 1940s)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: slugify("One-Time Pad"),
    year: "1919",
    sortYear: 1919,
    title: "One-Time Pad (Vernam Cipher)",
    summary:
      "Gilbert Vernam patented the One-Time Pad — a theoretically unbreakable cipher when used with a truly random key of equal length to the message.",
    description:
      "The Vernam cipher (OTP) XORs plaintext bits with a random key of the same length. Claude Shannon later proved that OTP achieves perfect secrecy — the ciphertext provides zero information about the plaintext regardless of computational power. However, OTP requires key distribution as long as the message, making it impractical for most modern applications. It was heavily used by intelligence agencies during the Cold War via physical paper pads.",
    category: "world-war",
    colour: CAT_COLOURS["world-war"],
    relatedCiphers: ["otp"],
    tags: ["otp", "perfect-secrecy", "shannon", "vernam", "xor"],
  },
  {
    id: slugify("Enigma machine"),
    year: "1918–1945",
    sortYear: 1918,
    title: "Enigma Machine",
    summary:
      "The German Enigma electro-mechanical rotor cipher was considered unbreakable — until Allied cryptanalysts led by Alan Turing cracked it, shortening WWII by years.",
    description:
      "Enigma used a set of rotating wired rotors and a plugboard (Steckerbrett) to implement a polyalphabetic substitution cipher. The German military believed its cryptographic strength was absolute. However, Polish mathematicians (Marian Rejewski) first reconstructed the wiring, and later Alan Turing's Bombe machines at Bletchley Park exploited operational weaknesses (known plaintexts, weather reports, key‑setting procedures) to decrypt a vast volume of Axis communications. This effort is credited with shortening the war by 2‑4 years and gave birth to modern computing.",
    category: "world-war",
    colour: CAT_COLOURS["world-war"],
    tags: ["rotor", "electromechanical", "wwii", "turing", "bombe"],
  },
  {
    id: slugify("Lorenz cipher"),
    year: "1941–1945",
    sortYear: 1941,
    title: "Lorenz SZ40/42 Cipher",
    summary:
      "The Lorenz cipher was a German teleprinter stream cipher broken by Bill Tutte and Tommy Flowers at Bletchley Park using the world's first programmable electronic computer, Colossus.",
    description:
      "Unlike Enigma, which was used by field units, Lorenz encrypted high‑level strategic communications between Hitler and his generals. It was a 12‑rotor stream cipher that produced a pseudorandom key stream to XOR with teleprinter characters. Bill Tutte deduced the complete logical structure of the Lorenz machine without ever seeing it, and Tommy Flowers designed Colossus — the world's first programmable electronic computer — to automate the decryption process. The Colossus project remained classified until the 1970s.",
    category: "world-war",
    colour: CAT_COLOURS["world-war"],
    tags: ["stream-cipher", "teleprinter", "colossus", "bletchley", "tutte"],
  },
  {
    id: slugify("Shannon information theory"),
    year: "1945–1949",
    sortYear: 1945,
    title: "Shannon's Information Theory",
    summary:
      "Claude Shannon published 'A Mathematical Theory of Cryptography', establishing the formal foundation for secrecy, entropy, and the concepts of confusion & diffusion.",
    description:
      "Shannon's 1945 classified report (declassified and published in 1949 as 'Communication Theory of Secrecy Systems') introduced the concepts of confusion (making the relationship between key and ciphertext complex) and diffusion (spreading plaintext redundancy across the ciphertext). He proved that OTP achieves perfect secrecy and formalised the quantitative measure of information (entropy). These ideas underpin every modern cipher design — AES, ChaCha20, and SHA‑3 all apply Shannon's principles.",
    category: "world-war",
    colour: CAT_COLOURS["world-war"],
    tags: ["entropy", "confusion", "diffusion", "perfect-secrecy", "mathematics"],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // MODERN ERA  (1970s – 2010s)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: slugify("DES"),
    year: "1972–1977",
    sortYear: 1972,
    title: "Data Encryption Standard (DES)",
    summary:
      "IBM's Feistel‑based block cipher, adopted by NBS (now NIST) as the first publicly available government encryption standard — a watershed moment in civilian cryptography.",
    description:
      "DES operates on 64‑bit blocks with a 56‑bit key, running 16 Feistel rounds. Developed at IBM with input from the NSA, it was published as FIPS 46 in 1977 and became the global standard for financial transactions, ATM networks, and secure communications. By the late 1990s, its 56‑bit key had become vulnerable to brute‑force attacks (the EFF's Deep Crack machine broke DES in under 3 days in 1998), leading to the Advanced Encryption Standard competition. Triple‑DES (3DES) extended its life, but DES's Feistel architecture influenced generations of cipher designs.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    relatedCiphers: ["des", "3des"],
    tags: ["feistel", "fips", "block-cipher", "standard", "ibm", "nsa"],
  },
  {
    id: slugify("Diffie-Hellman"),
    year: "1976",
    sortYear: 1976,
    title: "Diffie–Hellman Key Exchange",
    summary:
      "Whitfield Diffie and Martin Hellman introduced public‑key cryptography, solving the millennia‑old key‑distribution problem.",
    description:
      "Their seminal paper 'New Directions in Cryptography' proposed a method for two parties to agree on a shared secret over an insecure channel using modular exponentiation. The Diffie‑Hellman protocol is the foundation of secure key agreement in TLS, SSH, IPsec, and countless other protocols. Though later discovered to have been independently invented by James H. Ellis and Clifford Cocks at GCHQ several years earlier (classified), the public revelation revolutionised cryptography and enabled secure communication on the open internet.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    tags: ["public-key", "key-exchange", "discrete-log", "foundation", "gchq"],
  },
  {
    id: slugify("RSA"),
    year: "1977",
    sortYear: 1977,
    title: "RSA Cryptosystem",
    summary:
      "Rivest, Shamir, and Adleman created the first practical asymmetric encryption and digital signature scheme, based on the hardness of integer factorisation.",
    description:
      "RSA uses a public modulus n = p × q (two large primes), a public exponent e, and a private exponent d. Messages are encrypted as C = M^e mod n and decrypted as M = C^d mod n. RSA enabled digital signatures (non‑repudiation) and secure key exchange, becoming the backbone of TLS/SSL, PGP, and SSH. Key sizes have grown from 512 bits (broken in 1999) to 2048 and 4096 bits today. It remains widely deployed, though elliptic‑curve alternatives (ECDSA, EdDSA) are increasingly preferred.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    relatedCiphers: ["rsa"],
    tags: ["asymmetric", "factorisation", "signatures", "public-key", "pkcs"],
  },
  {
    id: slugify("AES"),
    year: "1997–2001",
    sortYear: 1997,
    title: "Advanced Encryption Standard (AES)",
    summary:
      "NIST's competition to replace DES chose Rijndael — a Belgian SPN cipher that is now the world's most widely deployed symmetric encryption algorithm.",
    description:
      "AES (Rijndael, designed by Joan Daemen and Vincent Rijmen) operates on 128‑bit blocks with 128/192/256‑bit keys through 10/12/14 rounds of SubBytes, ShiftRows, MixColumns, and AddRoundKey. It was selected from 15 candidates after a five‑year public competition and approved as FIPS 197 in 2001. AES is certified by the NSA for TOP SECRET data, embedded in every modern CPU (AES‑NI instructions), and used in TLS, WPA2/3, BitLocker, FileVault, and virtually every security protocol.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    relatedCiphers: ["aes"],
    tags: ["rijndael", "spn", "fips", "competition", "nist", "ubiquitous"],
  },
  {
    id: slugify("SHA-2"),
    year: "2001",
    sortYear: 2001,
    title: "SHA‑2 Hash Family",
    summary:
      "NIST published the SHA‑2 family (SHA‑224/256/384/512), designed by the NSA, which remains the gold standard for cryptographic hashing.",
    description:
      "SHA‑2 is built on the Merkle–Damgård construction with 64‑80 rounds of compression functions using bitwise rotations, modular additions, and logical functions (Ch, Maj, Σ). SHA‑256 and SHA‑512 are the most widely used variants, forming the backbone of digital signatures, certificate transparency, secure communication protocols, and file integrity verification. Despite successful collision attacks on SHA‑1 (2017, Google/INRIA), SHA‑2 remains fully secure, though NIST is promoting SHA‑3 as a backup.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    relatedCiphers: ["sha256"],
    tags: ["hash", "merkle-damgård", "nsa", "fips", "integrity"],
  },
  {
    id: slugify("ECC"),
    year: "1985–2010s",
    sortYear: 1985,
    title: "Elliptic‑Curve Cryptography (ECC)",
    summary:
      "Neal Koblitz and Victor Miller independently proposed using elliptic curves over finite fields to build public‑key systems with smaller keys than RSA.",
    description:
      "ECC provides equivalent security to RSA with dramatically smaller key sizes (e.g., 256‑bit ECC ≈ 3072‑bit RSA). Key algorithms include ECDH (key agreement), ECDSA (signatures), and the more recent EdDSA (Ed25519, Ed448). ECC is now the dominant public‑key technology in modern protocols: TLS 1.3 mandates ECDHE, secure messaging protocols mandate Ed25519, and Apple's iMessage uses ECC. Its security relies on the hardness of the elliptic‑curve discrete‑logarithm problem (ECDLP).",
    category: "modern",
    colour: CAT_COLOURS.modern,
    tags: ["ecc", "elliptic-curve", "ecdh", "eddsa", "key-agreement"],
  },
  {
    id: slugify("ChaCha20-Poly1305"),
    year: "2008–2014",
    sortYear: 2008,
    title: "ChaCha20 & Poly1305",
    summary:
      "Daniel Bernstein designed ChaCha20 (a fast, secure stream cipher) and Poly1305 (a one‑time MAC), forming a leading AEAD construction used in TLS 1.3 and WireGuard.",
    description:
      "ChaCha20 is a 20‑round ARX stream cipher derived from Salsa20. It is faster than AES in software (especially on mobile devices without AES‑NI), and its design avoids timing side channels. Combined with Poly1305 (a Wegman‑Carter MAC), it forms the AEAD_CHACHA20_POLY1305 construction. Google adopted it for TLS in Chrome, and it is now mandatory in TLS 1.3 and the sole cipher in WireGuard VPN. RFC 8439 standardises both algorithms.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    tags: ["stream-cipher", "aead", "djb", "tls", "wireguard", "software-speed"],
  },
  {
    id: slugify("SHA-3"),
    year: "2007–2015",
    sortYear: 2007,
    title: "SHA‑3 / Keccak",
    summary:
      "NIST's hash competition selected Keccak, a sponge‑construction hash designed by Bertoni, Daemen, Peeters, and Van Assche, as the SHA‑3 standard.",
    description:
      "Unlike SHA‑2's Merkle–Damgård design, SHA‑3 uses a novel sponge construction that absorbs input blocks and squeezes output. It is built on a large 1600‑bit state with 24 rounds of permutation. SHA‑3 supports variable‑length output (SHAKE128, SHAKE256 as XOFs). While SHA‑2 remains secure, SHA‑3 provides an entirely different mathematical structure, ensuring backup security if weaknesses are ever found in SHA‑2. It was standardised as FIPS 202 in 2015.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    tags: ["sponge", "keccak", "fips", "competition", "xof"],
  },
  {
    id: slugify("Heartbleed"),
    year: "2014",
    sortYear: 2014,
    title: "Heartbleed (CVE‑2014‑0160)",
    summary:
      "A catastrophic buffer‑over‑read vulnerability in OpenSSL's heartbeat extension leaked private keys and memory contents — the most impactful cryptographic bug of the 2010s.",
    description:
      "Heartbleed allowed attackers to read up to 64 KB of server memory by sending a malformed heartbeat request. The leaked memory often contained private keys, session cookies, and passwords. It affected ~17% of all HTTPS servers (half a million sites). The bug was introduced in OpenSSL 1.0.1 (2012) and went undetected for 2 years. It sparked the Linux Foundation's Core Infrastructure Initiative, led to massive certificate revocation, and revolutionised vulnerability disclosure practices.",
    category: "modern",
    colour: CAT_COLOURS.modern,
    tags: ["openssl", "vulnerability", "cve", "tls", "infrastructure"],
  },

  // ═════════════════════════════════════════════════════════════════════════
  // POST‑QUANTUM ERA  (2016 – present)
  // ═════════════════════════════════════════════════════════════════════════
  {
    id: slugify("NIST PQC competition"),
    year: "2016–2024",
    sortYear: 2016,
    title: "NIST Post‑Quantum Cryptography Standardisation",
    summary:
      "NIST initiated a multi‑year competition to select quantum‑resistant public‑key algorithms, culminating in the selection of CRYSTALS‑Kyber (ML‑KEM) and CRYSTALS‑Dilithium (ML‑DSA).",
    description:
      "Fearing that Shor's algorithm running on a large‑scale quantum computer would break RSA, ECC, and Diffie‑Hellman, NIST launched a public PQC standardisation process in 2016. After several rounds, NIST selected CRYSTALS‑Kyber for key encapsulation (ML‑KEM, FIPS 203) and CRYSTALS‑Dilithium for digital signatures (ML‑DSA, FIPS 204) in 2022–2024. SPHINCS+ (stateless hash‑based signatures, FIPS 205) was also selected. These standards mark the beginning of the post‑quantum transition.",
    category: "post-quantum",
    colour: CAT_COLOURS["post-quantum"],
    tags: ["pqc", "nist", "competition", "kyber", "dilithium", "lattice"],
  },
  {
    id: slugify("CNSA 2.0"),
    year: "2022–2035",
    sortYear: 2022,
    title: "NSA CNSA 2.0 / PQC Migration",
    summary:
      "The NSA announced CNSA 2.0, mandating a national‑security transition to post‑quantum algorithms by 2033, with commercial migration accelerating worldwide.",
    description:
      "The Commercial National Security Algorithm Suite (CNSA) 2.0 requires all US national‑security systems to migrate to NIST‑standardised PQC algorithms (ML‑KEM, ML‑DSA, and the LSH‑based FN-DSA) by 2033. This is driving one of the largest cryptographic transitions in history, comparable to the DES‑to‑AES migration. Industry giants (Google, Apple, Cloudflare, Microsoft) have already begun PQC experimentation in TLS, with Chrome deploying hybrid X25519+Kyber to millions of users.",
    category: "post-quantum",
    colour: CAT_COLOURS["post-quantum"],
    tags: ["cnsa", "migration", "nsa", "transition", "hybrid"],
  },
  {
    id: slugify("lattice cryptography"),
    year: "2024+",
    sortYear: 2024,
    title: "Lattice‑Based Cryptography (Mainstream)",
    summary:
      "Lattice‑based schemes (Kyber, Dilithium, Falcon) become the dominant post‑quantum paradigm, with software and hardware implementations reaching production readiness.",
    description:
      "Lattice cryptography relies on the hardness of Learning With Errors (LWE) and its ring variant (Ring‑LWE). CRYSTALS‑Kyber (ML‑KEM) and CRYSTALS‑Dilithium (ML‑DSA) are now official FIPS standards. OpenSSL 3.5+ ships with Kyber support, AWS KMS offers PQC key exchange, and Google's Chrome uses hybrid X25519+Kyber by default. The community is also standardising Falcon (FN‑DSA) for scenarios requiring compact signatures. The transition to a PQC‑ready internet is expected to take a decade.",
    category: "post-quantum",
    colour: CAT_COLOURS["post-quantum"],
    tags: ["lattice", "lwe", "kyber", "dilithium", "falcon", "hybrid"],
  },
];

// ── Derived helpers ────────────────────────────────────────────────────────

/** All unique categories in display order */
export const timelineCategories: TimelineCategory[] = [
  "classical",
  "world-war",
  "modern",
  "post-quantum",
];

export const categoryLabels: Record<TimelineCategory, string> = {
  classical:    "Classical Era",
  "world-war":  "World War Era",
  modern:       "Modern Era",
  "post-quantum": "Post-Quantum Era",
};

/** Sorted copy of entries (by sortYear ascending) */
export function getSortedEntries(): TimelineEntry[] {
  return [...timelineEntries].sort((a, b) => a.sortYear - b.sortYear);
}

