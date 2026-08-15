import type { Metadata } from 'next';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';
import FrodoKemVisualizer from '../../../components/cipher/FrodoKemVisualizer';
import LearningProgressionFooter from '../../../components/learning/LearningProgressionFooter';

export const metadata: Metadata = {
  title: 'FrodoKEM Post-Quantum KEM Visualizer | CryptoViz',
  description:
    'Interactive matrix-based Learning With Errors (LWE) post-quantum key encapsulation mechanism visualizer and comparison with ML-KEM (Kyber).',
};

export default function FrodoKemVisualizerPage() {
  return (
    <WorkspaceLayout activeCipherId="frodokem">
      <div className="min-w-0 flex-1 bg-white p-4 dark:bg-zinc-900/10 md:p-6 lg:p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-4 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">Why Quantum Threat?</h3>
              <p className="text-sm text-indigo-800/80 dark:text-indigo-300/80 mt-1">
                Curious why we need Post-Quantum Cryptography like FrodoKEM? Explore our Quantum Cryptanalysis lab to see Shor's and Grover's algorithms in action.
              </p>
            </div>
            <a href="/quantum-cryptanalysis" className="ml-4 shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md shadow transition-colors">
              Explore Lab
            </a>
          </div>
          <FrodoKemVisualizer />
          <LearningProgressionFooter cipherId="frodokem" context="visualizer" />
        </div>
      </div>
    </WorkspaceLayout>
  );
}
