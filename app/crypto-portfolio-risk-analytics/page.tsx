import CryptoPortfolioRiskVisualizer from '@/components/CryptoPortfolioRiskVisualizer';

export const metadata = {
  title: 'Crypto Portfolio Risk & Rebalancing Analytics Suite | CryptoViz',
  description: 'Enterprise-grade cryptocurrency portfolio Value at Risk (VaR), CVaR, Sharpe ratio optimization, and macro stress testing analytics engine.',
};

export default function PortfolioRiskAnalyticsPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <CryptoPortfolioRiskVisualizer />
    </main>
  );
}
