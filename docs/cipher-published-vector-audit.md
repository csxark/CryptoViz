# Published Cipher Vector Audit

Issue #720 reports that several core cipher implementations fail published
known-answer vectors:

- NOEKEON
- PRESENT
- RC6
- SEED
- SIMON
- SPECK
- Twofish

CryptoViz is an educational platform, so incorrect cipher output can mislead
learners. This patch adds a shared audit layer for published test vectors and
round-trip validation.

## Added files

- `lib/cipher/symmetric/publishedCipherVectors.ts`
- `tests/unit/symmetric/publishedCipherVectors.test.ts`
- `tests/unit/symmetric/affectedCipherPublishedVectors.todo.test.ts`
- `scripts/run-cipher-vector-audit.mjs`

## Published vector coverage

| Cipher | Variant | Key | Plaintext | Expected ciphertext |
|---|---|---|---|---|
| NOEKEON | NOEKEON-128 direct mode | `00000000000000000000000000000000` | `00000000000000000000000000000000` | `B1656851699E29FA24B70148503D2DFC` |
| PRESENT | PRESENT-80 | `00000000000000000000` | `0000000000000000` | `5579C1387B228445` |
| PRESENT | PRESENT-128 | `00000000000000000000000000000000` | `0000000000000000` | `96DB702A2E6900AF` |
| RC6 | RC6-32/20/16 | `00000000000000000000000000000000` | `00000000000000000000000000000000` | `8FC3A53656B1F778C129DF4E9848A41E` |
| SEED | SEED-128 | `00000000000000000000000000000000` | `000102030405060708090A0B0C0D0E0F` | `5EBAC6E0054E166819AFF1CC6D346CDB` |
| SIMON | SIMON64/128 | `1B1A1918131211100B0A090803020100` | `656B696C20646E75` | `44C8FC20B9DFA07A` |
| SPECK | SPECK64/128 | `1B1A1918131211100B0A090803020100` | `3B7265747475432D` | `8C6FA548454E028B` |
| Twofish | Twofish-128 | `00000000000000000000000000000000` | `00000000000000000000000000000000` | `9F589F5CF6122C32B6BFEC2F2AE8C35A` |

## Integration instructions

1. Fix each affected implementation under `lib/cipher/symmetric/*`.
2. Wire the real cipher exports into `tests/unit/symmetric/affectedCipherPublishedVectors.todo.test.ts`.
3. Remove `.skip` from the integration test once adapters point to real encrypt/decrypt helpers.
4. Run the focused audit and the full suite.

## Commands

```powershell
npx vitest run tests/unit/symmetric/publishedCipherVectors.test.ts
node scripts/run-cipher-vector-audit.mjs
npm run test
npm run build
```
