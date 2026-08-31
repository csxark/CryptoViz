import type { CipherStep } from "@/lib/cipher/types";

export interface TraceBufferOptions {
  capacity?: number;
  retainCompleted?: boolean;
}

export interface TraceBufferStats {
  total: number;
  retained: number;
  capacity: number;
  completed: boolean;
  cancelled: boolean;
}

const DEFAULT_CAPACITY = 32;

export class TraceBuffer {
  private readonly capacity: number;
  private readonly retainCompleted: boolean;
  private readonly entries = new Map<number, string>();

  private total = 0;
  private completed = false;
  private cancelled = false;

  constructor(options: TraceBufferOptions = {}) {
    this.capacity = Math.max(
      1,
      Math.floor(options.capacity ?? DEFAULT_CAPACITY),
    );
    this.retainCompleted = options.retainCompleted ?? true;
  }

  push(step: CipherStep): boolean {
    if (this.completed || this.cancelled) {
      return false;
    }

    const index = step.index ?? this.total;
    this.entries.set(index, JSON.stringify(step));
    this.total = Math.max(this.total, index + 1);

    this.enforceCapacity();
    return true;
  }

  pushBatch(steps: CipherStep[]): number {
    let accepted = 0;

    for (const step of steps) {
      if (!this.push(step)) break;
      accepted += 1;
    }

    return accepted;
  }

  get(index: number): CipherStep | undefined {
    const serialized = this.entries.get(index);

    if (serialized === undefined) {
      return undefined;
    }

    return JSON.parse(serialized) as CipherStep;
  }

  has(index: number): boolean {
    return this.entries.has(index);
  }

  complete(): void {
    if (this.cancelled) return;

    this.completed = true;

    if (!this.retainCompleted) {
      this.clear();
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.clear();
  }

  clear(): void {
    this.entries.clear();
  }

  dispose(): void {
    this.cancel();
  }

  getStats(): TraceBufferStats {
    return {
      total: this.total,
      retained: this.entries.size,
      capacity: this.capacity,
      completed: this.completed,
      cancelled: this.cancelled,
    };
  }

  toArray(): CipherStep[] {
    const steps: CipherStep[] = [];

    for (let index = 0; index < this.total; index += 1) {
      const step = this.get(index);

      if (step) {
        steps.push(step);
      }
    }

    return steps;
  }

  private enforceCapacity(): void {
    if (this.completed && this.retainCompleted) {
      return;
    }

    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;

      if (typeof oldest !== "number") {
        break;
      }

      this.entries.delete(oldest);
    }
  }
}