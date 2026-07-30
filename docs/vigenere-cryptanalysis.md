# Vigenère Cryptanalysis

The Vigenère cipher encrypts with a repeating keyword. Plaintext letter `pᵢ` and
key letter `k_{i mod m}` combine as

```text
cᵢ = (pᵢ + k_{i mod m}) mod 26
```

Because the shift changes from position to position, the ciphertext letter
histogram is flattened and the single-histogram chi-squared attack used against
Caesar (`lib/attacks/frequencyAnalysis.ts`) fails. The classical break works in
three stages instead, and each is visualized at `/attacks/vigenere-cryptanalysis`.

## Stage 1 — Kasiski examination

If the same plaintext fragment happens to align with the same part of the key,
it produces an identical ciphertext fragment. So for a genuine repeat,

```text
distance between occurrences ≡ 0 (mod m)
```

Collect the repeated 3- to 5-grams, take every pairwise distance, and factor
them. The true key length divides nearly all of the distances; chance repeats
contribute noise that shows up as scattered low-ratio candidates.

Kasiski published this in 1863. Charles Babbage found it around 1854 but never
published.

## Stage 2 — Index of Coincidence

Friedman's Index of Coincidence is the probability that two letters drawn from a
text without replacement are equal:

```text
IoC = Σ nᵢ(nᵢ − 1) / N(N − 1)
```

| Source | IoC |
| :--- | :--- |
| English prose | ≈ 0.0667 |
| Uniform random letters | ≈ 0.0385 (1/26) |
| Vigenère with a long key | approaches 0.0385 |

Split the ciphertext into `m` **cosets** — coset `j` holds the letters at
positions `≡ j (mod m)`. When `m` is the true key length every letter in a coset
was shifted by the same key letter, so the coset is monoalphabetic and its IoC
jumps back toward the English value.

One subtlety: every **multiple** of the true key length also produces
monoalphabetic cosets and scores just as well. The workbench therefore takes the
*smallest* key length that crosses the English-like threshold, and falls back to
a divisor-preferring search over the strongest score when nothing crosses it.

## Stage 3 — Per-column chi-squared

Once `m` is known, coset `j` is a Caesar cipher under key letter `j`. Score all
26 shifts with Pearson's chi-squared against the English distribution:

```text
χ² = Σ (observed − expected)² / expected
```

The lowest score wins, and the winning shift *is* the key letter. The margin
between the best and second-best score is reported as a confidence value — a
narrow margin means that column's coset was too short to be conclusive.

## Why this matters

Brute force over a length-`m` key costs `26^m` trials. Stage 3 costs `26 × m`
chi-squared evaluations. For a 8-letter key that is the difference between
2 × 10¹¹ and 208.

The lesson generalizes beyond classical ciphers: a cipher is not secure because
its keyspace is large. It is secure because no structure in the ciphertext lets
an attacker attack the key piecewise. Vigenère leaks exactly that structure.

## Reliability limits

The module refuses to analyse ciphertexts shorter than 40 letters and caps the
candidate key length so that no coset falls below 8 letters. Below those bounds
the histograms are too noisy for the statistics to mean anything, and the
workbench reports a warning rather than a silently wrong key.

## Manual testing

1. Open `/attacks/vigenere-cryptanalysis`.
2. The default ciphertext is a long English passage encrypted with `CRYPT`.
3. Press **Recover the key** — the banner should read `CRYPT` and the plaintext
   should be readable with its original punctuation intact.
4. Step through the three stage tabs: Kasiski distances, the IoC bar chart with
   its English and random reference lines, and the per-column chi-squared solve.
5. Replace the ciphertext with a short sample (under 40 letters) and confirm the
   simulator reports the too-short error rather than guessing.

## References

- Kasiski, F. W. (1863). *Die Geheimschriften und die Dechiffrir-Kunst*.
- Friedman, W. F. (1922). *The Index of Coincidence and Its Applications in
  Cryptography*. Riverbank Publication No. 22.
- Singh, S. (1999). *The Code Book*, chapter 2.
