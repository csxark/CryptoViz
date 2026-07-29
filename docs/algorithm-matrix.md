# Algorithm Compatibility Matrix

The Algorithm Compatibility Matrix (`/matrix`) provides a high-level overview of the cryptographic algorithms supported by CryptoViz, comparing them across several key dimensions:

- **Block Size**: The internal block size or data rate used by the algorithm.
- **Key Size**: Typical or supported key lengths.
- **Security**: The current security status (`secure`, `legacy`, `deprecated`, or `broken`).
- **Speed**: A qualitative measure of the algorithm's performance.
- **Common Applications**: Real-world uses for the algorithm.

## Adding a New Algorithm to the Matrix

To include a new algorithm in the matrix:

1. Ensure the algorithm is registered in `lib/cipher/registry.ts`.
2. Open `lib/cipher/matrixData.ts`.
3. Add a new `MatrixEntry` to the `ALGORITHM_MATRIX_DATA` array:

```typescript
{
  id: 'your-cipher-id', // Must match the ID in CIPHER_REGISTRY
  name: 'Cipher Name',
  category: 'symmetric', // Or 'asymmetric', 'hash', 'classical'
  blockSize: '128-bit',
  keySize: '256-bit',
  securityStatus: 'secure',
  speed: 'Fast',
  applications: ['Example App 1', 'Example App 2'],
}
```

## Component Architecture

- **`AlgorithmMatrix` Component**: Found at `components/matrix/AlgorithmMatrix.tsx`. Renders the responsive table and handles category filtering using Framer Motion for layout animations.
- **`MatrixPage`**: The Next.js route at `app/matrix/page.tsx` that hosts the component and provides page-level context.

## Testing

Tests for the matrix component are located in `tests/unit/components/AlgorithmMatrix.test.tsx`. Run tests with:

```bash
npm run test
```
