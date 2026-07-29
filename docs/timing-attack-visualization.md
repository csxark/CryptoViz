# Timing Attack Visualization

Timing attacks are side-channel attacks. They exploit small timing differences
to infer information about secrets.

A common example is an early-exit string comparison:

```ts
for (let i = 0; i < secret.length; i++) {
  if (secret[i] !== guess[i]) return false
}
return true
```

If the response takes longer when more leading characters are correct, an
attacker may recover a secret one character at a time.

## What the visualizer shows

- vulnerable early-exit comparison
- constant-time comparison
- matched prefix length
- simulated timing cost
- risk based on leaked prefix
- attempt-by-attempt table
- safe defensive guidance

## Defensive guidance

- Use constant-time comparison for secrets.
- Avoid early returns for sensitive comparisons.
- Rate-limit authentication attempts.
- Use framework or platform-provided secure comparison utilities.
- Do not write custom token/MAC/signature comparison code unless necessary.

## Manual testing

1. Open `/attacks/timing`.
2. Confirm the default secret and guess render timing results.
3. Try guesses with increasing matching prefixes.
4. Confirm vulnerable timing increases.
5. Confirm constant-time timing is comparatively stable.
6. Try an exact match and confirm both methods report a match.
7. Enter empty values and confirm friendly errors.
8. Resize to mobile width and confirm the page remains usable.
