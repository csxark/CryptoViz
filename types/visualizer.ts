export interface Algorithm {
  id: string;
  name: string;
  description: string;
  category: 'symmetric' | 'asymmetric' | 'hash';
}

export interface VisualizerStep {
  label: string;
  description: string;
  data: any;
}
