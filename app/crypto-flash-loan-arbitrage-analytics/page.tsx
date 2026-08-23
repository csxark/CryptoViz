import FlashLoanArbitrageVisualizer from '@/components/FlashLoanArbitrageVisualizer';

export const metadata = {
  title: 'Flash Loan Arbitrage & Execution Analytics | CryptoViz',
  description: 'Enterprise DeFi flash loan arbitrage analytics, multi-DEX price discrepancy scanner, gas overhead calculator, and atomic EVM execution simulator.',
};

export default function FlashLoanAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <FlashLoanArbitrageVisualizer />
    </main>
  );
}
