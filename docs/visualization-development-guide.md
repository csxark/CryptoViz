# Visualization Development Guide

This guide explains how to build new CryptoViz visualizations that are useful for
learning, easy to test, and safe to review.

## Development flow

1. Define the learning goal.
2. Keep algorithm behavior deterministic.
3. Model input, key, options, output, and selected step clearly.
4. Design educational steps with labels, notes, and highlights.
5. Use workers for heavy computations when applicable.
6. Add known-answer and invalid-input tests.
7. Check accessibility and responsive layout.
8. Document security context, limitations, and manual testing.

## What every visualization should include

- clear default demo input
- friendly validation errors
- deterministic output
- instrumented steps when useful
- security status or safety note
- responsive layout
- focused tests
- documentation or PR testing notes

## Manual testing template

```text
1. Open the feature in the browser.
2. Confirm the page renders without console errors.
3. Try the default demo input and confirm output appears.
4. Change input/options and confirm the visualization updates.
5. Trigger one invalid input and confirm a friendly error appears.
6. Check keyboard navigation for main controls.
7. Resize to mobile width and confirm the layout remains usable.
8. Run the focused test file for the new feature.
```

## Review checklist

- Does the feature match the existing project design language?
- Does it avoid breaking existing cipher worker behavior?
- Are errors shown to users clearly?
- Are tests focused on the new feature?
- Does documentation explain safe use and misuse?
