# Data Provenance

CryptoViz uses an explicit data provenance model to distinguish educational
simulations, fixed examples, locally calculated values, external data, and
cryptographically verified results.

## Provenance values

CryptoViz supports five provenance states:

| Provenance | Meaning |
| --- | --- |
| `simulated` | Educational or conceptual simulation that does not represent live operational state. |
| `static` | Fixed example or reference data that is not generated or fetched at runtime. |
| `derived` | Data calculated locally from application inputs, state, or deterministic processing. |
| `live` | Data obtained from an external source at runtime. |
| `verified` | Data for which an explicit verification procedure has produced evidence. |

## `simulated`

Use `simulated` when a feature models a concept for educational purposes.

Examples include:

- protocol walkthroughs;
- attack demonstrations;
- educational network simulations;
- simplified blockchain demonstrations;
- conceptual cryptographic visualizations.

Simulation data must not be described as live operational state.

Recommended UI terminology:

> Simulated

or:

> Educational simulation

## `static`

Use `static` for fixed data.

Examples include:

- hard-coded examples;
- documentation examples;
- fixed protocol parameters;
- published example messages;
- static reference datasets.

Recommended UI terminology:

> Static Example

## `derived`

Use `derived` when CryptoViz calculates the value locally.

Examples include:

- cipher output generated from user input;
- locally calculated hashes;
- mathematical calculations;
- locally generated visualizer traces;
- derived benchmark measurements.

Recommended UI terminology:

> Locally Derived

## `live`

Use `live` only when the feature obtains data from an external source at
runtime.

A live data declaration should identify the source when possible.

Example:

```ts
{
  provenance: "live",
  source: "Example API",
  sourceUrl: "https://example.com/api"
}