# Linear Cryptanalysis Simulator

Linear cryptanalysis is a powerful plaintext-known attack first introduced by Mitsuru Matsui in 1993. It targets block ciphers by exploiting high-probability linear approximations between input bits, output bits, and key bits.

CryptoViz implements an interactive playground demonstrating this attack against a simplified 2-round Substitution-Permutation Network (SPN) block cipher.

## Features

- **LAT Explorer**: Interactive $16 \times 16$ Linear Approximation Table grid for Heys S-box. Shows dynamic input/output mask parity evaluations for all 16 inputs.
- **Piling-up Lemma**: Interactive calculator combining multiple round biases using Matsui's Piling-up theorem: $ε = 2^{r-1} \prod(ε_i)$.
- **SPN Cipher Trace**: Step-by-step 2-round SPN cipher flow detailing key addition, S-box substitution, and bit permutation layers.
- **Key Recovery Playground**: Runs Matsui's last-round key recovery attack over $N$ plaintext-ciphertext samples, ranking candidates for final round key $K_3$ by absolute bias.

## Core Files

- `lib/attacks/linearCryptanalysis.ts`
- `components/attacks/LinearCryptanalysisSimulator.tsx`
- `app/attacks/linear-cryptanalysis/page.tsx`
- `content/docs/linear-cryptanalysis.mdx`
- `tests/unit/attacks/linearCryptanalysis.test.ts`
