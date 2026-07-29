# Interactive RSA Key Generation Wizard

The RSA Key Generation Wizard explains how a toy RSA key pair is created.

## Flow

1. Select two distinct prime numbers `p` and `q`.
2. Compute the modulus `n = p × q`.
3. Compute Euler's totient `φ(n) = (p - 1)(q - 1)`.
4. Choose a public exponent `e` that is coprime with `φ(n)`.
5. Compute the private exponent `d = e⁻¹ mod φ(n)`.
6. Assemble the public key `(n, e)` and private key `(n, d)`.

## Default example

```text
p = 61
q = 53
e = 17
n = 3233
φ(n) = 3120
d = 2753
public key = (3233, 17)
private key = (3233, 2753)
```

## Security warning

This wizard uses tiny primes so the math is easy to inspect. These keys are not
secure. Production RSA key generation must use audited cryptographic libraries,
large random primes, safe padding schemes, and well-reviewed protocols.

## Manual testing

1. Open `/visualizer/rsa-keygen`.
2. Confirm the default example generates `n = 3233` and `d = 2753`.
3. Change `p` or `q` and confirm all derived values update.
4. Enter a non-prime value and confirm a friendly error appears.
5. Enter the same prime for `p` and `q` and confirm validation prevents it.
6. Try an exponent that is not coprime with `φ(n)` and confirm validation prevents it.
7. Click each wizard step and confirm the explanation changes.
8. Resize to mobile width and confirm the layout remains usable.
