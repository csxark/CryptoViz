// types/differential-cryptanalysis.ts

export type SBoxTable = number[];

export interface DifferencePair {
  p1: number;
  p2: number;
  c1: number;
  c2: number;
  inputDiff: number;
  outputDiff: number;
}

export interface DDTCell {
  inputDiff: number;
  outputDiff: number;
  count: number;
  probability: number;
}

export interface KeyCandidateScore {
  key: number;
  count: number;
}

export interface DifferentialAttackState {
  numPairs: number;
  targetInputDiff: number;
  targetOutputDiff: number;
  isAnalyzing: boolean;
  topKeyCandidates: KeyCandidateScore[];
  actualKey?: number;
}