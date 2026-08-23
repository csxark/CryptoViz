import ZkProofVisualizer from '@/components/ZkProofVisualizer';

export const metadata = {
  title: 'Zero-Knowledge Proof (ZKP) Range & Membership Analytics | CryptoViz',
  description: 'Enterprise zero-knowledge proof verification suite featuring Pedersen commitments, Schnorr NIZK discrete logarithm proofs, Bulletproofs range proofs, and Merkle tree membership.',
};

export default function ZkProofAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <ZkProofVisualizer />
    </main>
  );
}
