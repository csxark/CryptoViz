import LiquidityPoolVisualizer from '@/components/LiquidityPoolVisualizer';

export const metadata = {
  title: 'Liquidity Pool & Impermanent Loss Analytics Suite | CryptoViz',
  description: 'Enterprise DeFi liquidity pool analytics, Uniswap v2/v3 concentrated liquidity impermanent loss calculator, fee APY forecaster, and break-even simulator.',
};

export default function LiquidityPoolAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <LiquidityPoolVisualizer />
    </main>
  );
}
