// lib/protocols/blindSignature.ts

export interface RSAKeypair {
    n: bigint; // Modulus
    e: bigint; // Public exponent
    d: bigint; // Private exponent
}

export interface BlindSignatureResult {
    blindedMessage: bigint;
    blindedSignature: bigint;
    unblindedSignature: bigint;
    isValid: boolean;
}

/**
 * Modular exponentiation helper: (base^exp) % mod
 */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
    let res = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) res = (res * base) % mod;
        base = (base * base) % mod;
        exp /= 2n;
    }
    return res;
}

/**
 * Extended Euclidean Algorithm for modular inverse.
 */
export function modInverse(a: bigint, m: bigint): bigint {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }

    return (old_s + m) % m;
}

/**
 * Generates a mock RSA keypair for educational / playground demonstrations.
 */
export function generateDemoRSAKey(): RSAKeypair {
    // Small primes for demo playground (p = 61, q = 53 -> n = 3233, phi = 3120, e = 17, d = 2753)
    const n = 3233n;
    const e = 17n;
    const d = 2753n;
    return { n, e, d };
}

/**
 * Blinds a message using a random blinding factor r: m' = m * r^e mod n
 */
export function blindMessage(message: bigint, r: bigint, key: RSAKeypair): bigint {
    const rPowE = modPow(r, key.e, key.n);
    return (message * rPowE) % key.n;
}

/**
 * Signer signs the blinded message without seeing the original content: s' = (m')^d mod n
 */
export function signBlindedMessage(blindedMessage: bigint, key: RSAKeypair): bigint {
    return modPow(blindedMessage, key.d, key.n);
}

/**
 * Unblinds the signature to produce a valid signature for the original message: s = s' * r^(-1) mod n
 */
export function unblindSignature(blindedSignature: bigint, r: bigint, key: RSAKeypair): bigint {
    const rInv = modInverse(r, key.n);
    return (blindedSignature * rInv) % key.n;
}

/**
 * Verifies the unblinded signature against the original message: m == s^e mod n
 */
export function verifySignature(message: bigint, signature: bigint, key: RSAKeypair): boolean {
    const decryptedMessage = modPow(signature, key.e, key.n);
    return decryptedMessage === (message % key.n);
}
