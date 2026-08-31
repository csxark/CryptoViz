# Visual Regression Baseline Tests (`tests/visual/`)

Automated Playwright visual regression baseline screenshot comparison suite targeting canvas and SVG cipher diagrams in CryptoViz (#1476).

## Running Visual Tests

To run the Playwright visual regression test suite:

```bash
npm run test:visual
```

## Generating & Updating Visual Snapshots

To generate or update baseline screenshots locally when UI styling intentionally changes:

```bash
npx playwright test tests/visual --update-snapshots
```

## Tested Visualizers & Diagram Components

- **Playfair Grid** (`canvas`, `svg`, matrix container)
- **Rail Fence Transposition** (`.matrix-grid`)
- **Diffie-Hellman Key Exchange** (SVG ladder / paint mixing diagram)
- **HMAC Construction** (Block padding diagram)
- **SM3 Compression Function** (State diagram)
- **AES State Matrix** (`2D grid`, canvas)
- **S-Box Explorer** (`table`, heatmap canvas)
- **Dark Mode Baseline** (Theme color scheme verification)
