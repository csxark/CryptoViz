declare module 'vitest' {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): T
  }
}

export {}
